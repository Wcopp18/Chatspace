/**
 * Chat Event Engine
 *
 * Decides WHEN and WHAT promotion surfaces to inject into the chat thread.
 *
 * Design principles:
 * - Mostly random, state-aware, impossible to fully predict
 * - Rising tension increases chance of premium surfaces
 * - Cooldown protection prevents repetitive surfaces
 * - Sometimes intentionally triggers nothing for realism
 * - Per-girl tuning via trigger rules
 */

import type {
  Promotion,
  PromotionType,
  EventSessionState,
  EventDecision,
  EventHistoryEntry,
} from "@/types/promotions";

// ── Core decision function ──

export function evaluateEventInjection(
  state: EventSessionState,
  promotions: Promotion[],
): EventDecision {
  // Filter to active promotions only
  const active = promotions.filter((p) => p.status === "active");
  if (active.length === 0) {
    return { shouldInject: false, promotion: null, reason: "no_active_promotions" };
  }

  // Base eligibility: need at least 3 message exchanges (per-type rules enforce higher)
  if (state.messageExchangeCount < 3) {
    return { shouldInject: false, promotion: null, reason: "too_few_messages" };
  }

  // Global cooldown: at least 2 minutes between any events
  if (state.lastEventAt && Date.now() - state.lastEventAt < 120_000) {
    return { shouldInject: false, promotion: null, reason: "global_cooldown" };
  }

  // Realism gate: 25% chance of intentionally doing nothing even when eligible
  // This makes the system feel unpredictable
  const realismRoll = Math.random();
  if (realismRoll < 0.25) {
    return { shouldInject: false, promotion: null, reason: "realism_skip" };
  }

  // Score each eligible promotion
  const scored = active
    .map((promo) => ({
      promo,
      score: calculateEligibilityScore(promo, state),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { shouldInject: false, promotion: null, reason: "no_eligible_promotions" };
  }

  // Weighted random selection from top candidates
  const selected = weightedRandomSelect(scored);

  // Final probability gate based on tension
  const tensionMultiplier = getTensionMultiplier(state.tensionScore);
  const finalProbability = Math.min(0.85, 0.3 * tensionMultiplier);

  if (Math.random() > finalProbability) {
    return { shouldInject: false, promotion: null, reason: "probability_gate" };
  }

  return {
    shouldInject: true,
    promotion: selected,
    reason: "eligible",
  };
}

// ── Eligibility scoring ──

function calculateEligibilityScore(
  promo: Promotion,
  state: EventSessionState,
): number {
  const rules = promo.triggerRules;
  let score = rules.weight;

  // Hard filters — return 0 if not eligible
  if (state.messageExchangeCount < rules.minMessageExchanges) return 0;
  if (state.tensionScore < rules.tensionThreshold) return 0;

  // Tension band filter
  if (rules.tensionBandFilter.length > 0 && !rules.tensionBandFilter.includes(state.tensionBand)) {
    return 0;
  }

  // Max per session check
  const shownThisSession = state.eventHistory.filter(
    (e) => e.promotionId === promo.id,
  ).length;
  if (shownThisSession >= rules.maxPerSession) return 0;

  // Type cooldown check
  const lastOfType = state.eventHistory
    .filter((e) => e.type === promo.type)
    .sort((a, b) => b.shownAt - a.shownAt)[0];

  if (lastOfType) {
    const minutesSince = (Date.now() - lastOfType.shownAt) / 60_000;
    if (minutesSince < rules.cooldownMinutes) return 0;
  }

  // Unlock history requirement
  if (rules.requiresUnlockHistory && state.unlockHistory.length === 0) return 0;

  // ── Soft scoring (higher = more likely) ──

  // Tension bonus: higher tension = higher score for premium content
  score *= getTensionMultiplier(state.tensionScore);

  // Message exchange bonus: more messages = slight increase
  score *= 1 + Math.min(state.messageExchangeCount * 0.02, 0.5);

  // Inactivity bonus: if user hasn't messaged in a while, trigger something
  if (state.inactivitySeconds > 60) {
    score *= 1.3;
  }

  // Priority bonus
  score += rules.priority * 2;

  // Type-specific tension sync
  if (promo.type === "timer_urgency" && state.tensionScore >= 60) {
    score *= 1.5;
  }
  if (promo.type === "media_teaser" && state.tensionScore >= 40) {
    score *= 1.3;
  }
  if (promo.type === "bundle_rail" && state.unlockHistory.length > 0) {
    score *= 1.4;
  }
  if (promo.type === "reward_progress" && state.messageExchangeCount >= 8) {
    score *= 1.2;
  }
  if (promo.type === "discovery_circles" && state.messageExchangeCount >= 15) {
    score *= 1.3;
  }

  // Reduce score if this exact type was shown recently
  if (state.lastEventType === promo.type) {
    score *= 0.3;
  }

  return Math.max(0, score);
}

// ── Tension multiplier ──

function getTensionMultiplier(tensionScore: number): number {
  if (tensionScore >= 90) return 2.5;
  if (tensionScore >= 70) return 2.0;
  if (tensionScore >= 50) return 1.5;
  if (tensionScore >= 30) return 1.2;
  return 1.0;
}

// ── Weighted random selection ──

function weightedRandomSelect(
  scored: Array<{ promo: Promotion; score: number }>,
): Promotion {
  const totalWeight = scored.reduce((sum, s) => sum + s.score, 0);
  let random = Math.random() * totalWeight;

  for (const { promo, score } of scored) {
    random -= score;
    if (random <= 0) return promo;
  }

  return scored[scored.length - 1].promo;
}

// ── Session state management ──

export function createEventSessionState(): EventSessionState {
  return {
    sessionStartedAt: Date.now(),
    messageExchangeCount: 0,
    tensionScore: 0,
    tensionBand: "warming_up",
    lastEventAt: null,
    lastEventType: null,
    eventHistory: [],
    unlockHistory: [],
    purchaseCount: 0,
    inactivitySeconds: 0,
  };
}

export function recordEvent(
  state: EventSessionState,
  promotionId: string,
  type: PromotionType,
): EventSessionState {
  const entry: EventHistoryEntry = {
    promotionId,
    type,
    shownAt: Date.now(),
    interacted: false,
  };

  return {
    ...state,
    lastEventAt: Date.now(),
    lastEventType: type,
    eventHistory: [...state.eventHistory, entry],
  };
}

export function updateSessionState(
  state: EventSessionState,
  updates: Partial<EventSessionState>,
): EventSessionState {
  return { ...state, ...updates };
}

// ── Default trigger rules ──

export function getDefaultTriggerRules(type: PromotionType) {
  const base = {
    minMessageExchanges: 5,
    tensionThreshold: 20,
    weight: 50,
    cooldownMinutes: 8,
    priority: 5,
    maxPerSession: 2,
    requiresUnlockHistory: false,
    tensionBandFilter: [] as string[],
  };

  switch (type) {
    case "media_teaser":
      return { ...base, minMessageExchanges: 4, tensionThreshold: 25, weight: 60, cooldownMinutes: 10, priority: 8 };
    case "timer_urgency":
      return { ...base, minMessageExchanges: 6, tensionThreshold: 45, weight: 40, cooldownMinutes: 15, priority: 9, maxPerSession: 1 };
    case "bundle_rail":
      return { ...base, minMessageExchanges: 8, tensionThreshold: 30, weight: 45, cooldownMinutes: 12, priority: 6, requiresUnlockHistory: true };
    case "reward_progress":
      return { ...base, minMessageExchanges: 3, tensionThreshold: 10, weight: 55, cooldownMinutes: 5, priority: 4, maxPerSession: 3 };
    case "discovery_circles":
      return { ...base, minMessageExchanges: 12, tensionThreshold: 15, weight: 30, cooldownMinutes: 20, priority: 3, maxPerSession: 1 };
  }
}

// ── Default promotion templates ──

export function createDefaultPromotion(type: PromotionType): Omit<Promotion, "id" | "createdAt" | "updatedAt"> {
  const triggerRules = getDefaultTriggerRules(type);

  const base = {
    type,
    personaId: null,
    personaIds: [],
    subtitle: "",
    description: "",
    ctaAction: "unlock",
    previewImageUrl: null,
    previewVideoUrl: null,
    headline: "",
    timerDurationMinutes: 30,
    originalPrice: null,
    promoPrice: null,
    bundleTitle: "",
    bundleItems: [],
    recommendedPersonaIds: [],
    progressCopy: "",
    nextRewardLabel: "",
    requiredActions: 5,
    triggerRules,
    status: "active" as const,
  };

  switch (type) {
    case "media_teaser":
      return {
        ...base,
        title: "Only You Get To See Her Like This",
        ctaText: "Unlock Now",
        headline: "Only You Get To See Her Like This",
      };
    case "timer_urgency":
      return {
        ...base,
        title: "Limited Time Only",
        ctaText: "Claim Before It's Gone",
        timerDurationMinutes: 30,
        originalPrice: 9.99,
        promoPrice: 4.99,
      };
    case "bundle_rail":
      return {
        ...base,
        title: "More from tonight",
        ctaText: "View Bundle",
        bundleTitle: "More from tonight",
      };
    case "discovery_circles":
      return {
        ...base,
        title: "More girls you might click with",
        ctaText: "Say Hi",
      };
    case "reward_progress":
      return {
        ...base,
        title: "Keep going...",
        ctaText: "Continue",
        progressCopy: "2 more replies until she opens up more",
        nextRewardLabel: "Tonight's surprise",
        requiredActions: 5,
      };
  }
}
