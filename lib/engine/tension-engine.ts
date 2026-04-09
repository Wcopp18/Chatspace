/**
 * Tension Engine v2 — Conversation-scoped visible tension + hidden reward momentum
 *
 * Layer A: Visible tension meter (0-100%) — user sees this
 *   Session-scoped, resets after 30min inactivity or fresh entry.
 *   Represents conversational momentum / chemistry / reward readiness.
 *
 * Layer B: Hidden reward momentum — user never sees this
 *   Internal score driving premium event probability.
 *   Combines visible tension, engagement quality, session time, and behavior signals.
 *
 * Bands (visible only as zone labels):
 *   0-20  = warming_up
 *   21-40 = building
 *   41-60 = vibing
 *   61-80 = heating_up
 *   81-100 = peak
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TensionBand } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

// ── Constants ──

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_START_TENSION = 18;

// ── Band thresholds ──

export function getTensionBand(score: number): TensionBand {
  if (score >= 81) return "video_zone";      // peak
  if (score >= 61) return "premium_zone";    // heating_up
  if (score >= 41) return "image_zone";      // vibing
  return "warming_up";                        // warming_up + building
}

// ── Message quality analysis ──

export interface MessageAnalysis {
  messageLength: number;
  flirtIntensity: number;       // 0-1
  emotionalOpenness: number;    // 0-1
  responseSpeedSeconds: number;
  isSpammy: boolean;
  isDemanding: boolean;
  isMoodBreaking: boolean;
  isDry: boolean;
  isHighInvestment: boolean;
  justUnlockedReward: boolean;  // pushed right after a reward
}

// ── Visible tension delta calculation ──

export function calculateVisibleDelta(analysis: MessageAnalysis): { delta: number; reason: string } {
  let delta = 0;
  const reasons: string[] = [];

  // ── Positive momentum ──

  // Base good exchange: +4
  if (!analysis.isDry && !analysis.isSpammy && !analysis.isDemanding && !analysis.isMoodBreaking) {
    delta += 4;
    reasons.push("good_exchange");
  }

  // Strong/flirty/engaging: +3 to +6
  if (analysis.flirtIntensity > 0.3) {
    const flirtBonus = 3 + analysis.flirtIntensity * 3; // 3-6
    delta += flirtBonus;
    reasons.push("flirty");
  }

  // High-investment continuation: +4 to +7
  if (analysis.isHighInvestment) {
    delta += 4 + Math.min(analysis.messageLength / 80, 3); // 4-7
    reasons.push("high_investment");
  }

  // Emotional openness / vulnerability: +5 to +8
  if (analysis.emotionalOpenness > 0.4) {
    delta += 5 + analysis.emotionalOpenness * 3; // 5-8
    reasons.push("emotional_openness");
  }

  // ── Weak / neutral ──

  // Dry message: 0 to -2
  if (analysis.isDry) {
    delta += -1 - Math.random(); // -1 to -2
    reasons.push("dry");
  }

  // Passive delayed: -1 to +1
  if (analysis.responseSpeedSeconds > 120 && !analysis.isHighInvestment) {
    delta += -1 + Math.random() * 2; // -1 to +1
    reasons.push("delayed");
  }

  // ── Negative ──

  // Spam/demanding: -3 to -6
  if (analysis.isSpammy || analysis.isDemanding) {
    delta -= 3 + Math.random() * 3; // -3 to -6
    reasons.push(analysis.isSpammy ? "spam" : "demanding");
  }

  // Mood-breaking / off-tone: -2 to -5
  if (analysis.isMoodBreaking) {
    delta -= 2 + Math.random() * 3; // -2 to -5
    reasons.push("mood_breaking");
  }

  // Pushy immediately after reward: -4 to -7
  if (analysis.justUnlockedReward) {
    delta -= 4 + Math.random() * 3; // -4 to -7
    reasons.push("pushy_post_reward");
  }

  // ── Time effects ──

  // Inactivity return: -4 to -8
  if (analysis.responseSpeedSeconds > 300) {
    delta -= 4 + Math.min((analysis.responseSpeedSeconds - 300) / 300, 4); // -4 to -8
    reasons.push("inactivity_return");
  }

  // Tiny hidden variance: -1 to +2
  delta += -1 + Math.random() * 3;

  return {
    delta: Math.round(delta * 10) / 10,
    reason: reasons.join(","),
  };
}

// ── Reward pacing drops (applied to visible tension after unlock) ──

export function getRewardDrop(rewardType: "image" | "video" | "bundle"): number {
  switch (rewardType) {
    case "image": return -10;
    case "video": return -15;
    case "bundle": return -(12 + Math.random() * 4); // -12 to -16
    default: return -10;
  }
}

// ── Flirt intensity analyzer (enhanced) ──

const FLIRT_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\b(miss|want|need|crave)\s*(you|u)\b/i, weight: 0.3 },
  { pattern: /\b(beautiful|gorgeous|sexy|hot|stunning)\b/i, weight: 0.2 },
  { pattern: /\bwish\s*(you|u)\s*were\s*here\b/i, weight: 0.35 },
  { pattern: /\b(kiss|cuddle|hold|touch)\b/i, weight: 0.25 },
  { pattern: /\bthinking\s*(about|of)\s*(you|u)\b/i, weight: 0.25 },
  { pattern: /\bcome\s*over\b/i, weight: 0.3 },
  { pattern: /😏|😘|🥵|😈|💋|🔥|❤️‍🔥/u, weight: 0.15 },
  { pattern: /💕|❤️|🥰|💗|😍/u, weight: 0.1 },
  { pattern: /\b(love|obsessed|crazy\s*about)\b/i, weight: 0.2 },
];

export function analyzeFlirtIntensity(message: string): number {
  let intensity = 0;
  for (const { pattern, weight } of FLIRT_KEYWORDS) {
    if (pattern.test(message)) intensity += weight;
  }
  return Math.min(intensity, 1);
}

// ── Emotional openness analyzer ──

const VULNERABILITY_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\b(i feel|feeling|i've been|honestly|truthfully)\b/i, weight: 0.2 },
  { pattern: /\b(scared|afraid|nervous|worried|anxious)\b/i, weight: 0.25 },
  { pattern: /\b(trust|open up|vulnerable|real talk)\b/i, weight: 0.3 },
  { pattern: /\b(miss|lonely|wish|hope)\b/i, weight: 0.15 },
  { pattern: /\b(never told|secret|confession|admit)\b/i, weight: 0.35 },
  { pattern: /\b(means a lot|important to me|care about)\b/i, weight: 0.2 },
];

export function analyzeEmotionalOpenness(message: string): number {
  let score = 0;
  for (const { pattern, weight } of VULNERABILITY_PATTERNS) {
    if (pattern.test(message)) score += weight;
  }
  // Longer messages with emotional content = more vulnerable
  if (message.length > 80 && score > 0) score += 0.15;
  return Math.min(score, 1);
}

// ── Spam / demanding / dry / mood-breaking detection ──

const SPAM_PATTERNS = [
  /^(.)\1{4,}$/i,                     // repeated chars
  /\b(send|show|give)\s*(me|now)\b/i,  // demanding content
  /^(hi|hey|yo|sup|k|ok|lol|haha)\s*$/i, // minimal effort
];

const DEMANDING_PATTERNS = [
  /\b(send\s*(nudes|pics|photos|video))\b/i,
  /\b(show\s*me\s*(something|more))\b/i,
  /\b(unlock|free|give\s*me)\b/i,
  /\b(hurry|now|faster|come\s*on)\b/i,
];

const MOOD_BREAK_PATTERNS = [
  /\b(whatever|don't care|boring|stupid|dumb|lame)\b/i,
  /\b(shut up|stop|leave me|go away)\b/i,
  /\b(other girls|someone else|your competitor)\b/i,
];

export function analyzeMessage(message: string): Omit<MessageAnalysis, "responseSpeedSeconds" | "justUnlockedReward"> {
  const flirtIntensity = analyzeFlirtIntensity(message);
  const emotionalOpenness = analyzeEmotionalOpenness(message);
  const messageLength = message.length;
  const isSpammy = SPAM_PATTERNS.some(p => p.test(message));
  const isDemanding = DEMANDING_PATTERNS.some(p => p.test(message));
  const isMoodBreaking = MOOD_BREAK_PATTERNS.some(p => p.test(message));
  const isDry = messageLength < 6 && flirtIntensity === 0 && emotionalOpenness === 0;
  const isHighInvestment = messageLength > 60 && (flirtIntensity > 0.1 || emotionalOpenness > 0.1);

  return {
    messageLength,
    flirtIntensity,
    emotionalOpenness,
    isSpammy,
    isDemanding,
    isMoodBreaking,
    isDry,
    isHighInvestment,
  };
}

// ── Hidden reward momentum (Layer B) ──

export interface SessionState {
  visibleTension: number;
  qualityExchangeCount: number;    // exchanges with positive delta
  engagementStreak: number;        // consecutive positive exchanges
  sessionStartedAt: number;        // timestamp ms
  premiumEventsThisSession: number;
  lastPremiumEventAt: number | null;
  lastPremiumEventExchange: number; // exchange # of last premium event
  exchangeCount: number;
  clickedPreviousTeaser: boolean;
  openedMomentsShelf: boolean;
  spamCount: number;
  // Per-type cooldown tracking
  lastEventTypeExchange: Record<string, number>;
}

export function calculateRewardMomentum(state: SessionState): number {
  const minutesInSession = Math.min((Date.now() - state.sessionStartedAt) / 60000, 20);

  let momentum =
    (state.visibleTension * 0.45) +
    (state.qualityExchangeCount * 2.2) +
    (state.engagementStreak * 3) +
    (minutesInSession * 0.75) +
    (state.premiumEventsThisSession === 0 ? 8 : 0) +
    (state.clickedPreviousTeaser ? 6 : 0) +
    (state.openedMomentsShelf ? 4 : 0);

  // Cooldown penalty
  if (state.lastPremiumEventAt) {
    const secondsSince = (Date.now() - state.lastPremiumEventAt) / 1000;
    if (secondsSince < 90) momentum -= 30; // hard block
    else if (secondsSince < 180) momentum -= 15;
  }

  // Spam penalty
  momentum -= state.spamCount * 5;

  return Math.max(0, momentum);
}

// ── Premium event eligibility (uses hidden momentum) ──

export type PremiumEventType = "teaser" | "timer" | "bundle" | "discovery" | "reward_progress";

const EVENT_COOLDOWNS: Record<PremiumEventType, number> = {
  teaser: 4,        // 4 exchanges between teasers
  timer: 6,
  bundle: 7,
  discovery: 5,
  reward_progress: 4,
};

export interface PremiumEventDecision {
  shouldTrigger: boolean;
  eventType: PremiumEventType | null;
  forcedReason: string | null;  // non-null if fairness guarantee kicked in
  momentum: number;
}

export function evaluatePremiumEvent(state: SessionState): PremiumEventDecision {
  const momentum = calculateRewardMomentum(state);
  const { exchangeCount, visibleTension, premiumEventsThisSession, lastPremiumEventExchange, lastPremiumEventAt } = state;
  const exchangesSinceLastEvent = exchangeCount - lastPremiumEventExchange;

  // ── Hard blocks ──

  // Min 3 exchanges between any premium events
  if (exchangesSinceLastEvent < 3) {
    return { shouldTrigger: false, eventType: null, forcedReason: null, momentum };
  }

  // Min 90 seconds between premium events
  if (lastPremiumEventAt && (Date.now() - lastPremiumEventAt) < 90_000) {
    return { shouldTrigger: false, eventType: null, forcedReason: null, momentum };
  }

  // ── Fairness guarantees (hidden, forced) ──

  // First teaser guarantee: 8+ exchanges, tension >= 45%, no event yet
  if (exchangeCount >= 8 && visibleTension >= 45 && premiumEventsThisSession === 0) {
    return { shouldTrigger: true, eventType: "teaser", forcedReason: "first_teaser_guarantee", momentum };
  }

  // No dead-session rule: 12+ exchanges, tension >= 30, still no image teaser
  if (exchangeCount >= 12 && visibleTension >= 30 && premiumEventsThisSession === 0) {
    return { shouldTrigger: true, eventType: "teaser", forcedReason: "no_dead_session", momentum };
  }

  // Strong session premium: 18+ exchanges, avg tension >= 50, cooldown allows
  if (exchangeCount >= 18 && visibleTension >= 50 && exchangesSinceLastEvent >= 6) {
    return { shouldTrigger: true, eventType: "bundle", forcedReason: "strong_session_premium", momentum };
  }

  // ── Probability-based triggering ──

  // Normalize momentum to a probability (0-0.85 range, never 100%)
  const baseProbability = Math.min(momentum / 120, 0.85);

  if (Math.random() > baseProbability) {
    return { shouldTrigger: false, eventType: null, forcedReason: null, momentum };
  }

  // ── Pick event type (respecting per-type cooldowns) ──
  const candidates: PremiumEventType[] = ["teaser", "timer", "bundle", "discovery", "reward_progress"];
  const eligible = candidates.filter(type => {
    const lastExchange = state.lastEventTypeExchange[type] || 0;
    return (exchangeCount - lastExchange) >= EVENT_COOLDOWNS[type];
  });

  if (eligible.length === 0) {
    return { shouldTrigger: false, eventType: null, forcedReason: null, momentum };
  }

  // Weight toward teasers at lower tension, bundles at higher
  const weights = eligible.map(type => {
    if (type === "teaser") return visibleTension < 50 ? 4 : 2;
    if (type === "timer") return visibleTension >= 60 ? 3 : 1;
    if (type === "bundle") return visibleTension >= 70 ? 3 : 1;
    if (type === "discovery") return 2;
    if (type === "reward_progress") return 2;
    return 1;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let selectedType: PremiumEventType = eligible[0];
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { selectedType = eligible[i]; break; }
  }

  return { shouldTrigger: true, eventType: selectedType, forcedReason: null, momentum };
}

// ── Cinematic phrase system ──

const RISING_PHRASES: Record<string, string[]> = {
  "0-20": [
    "Just getting started…",
    "She's sizing you up",
    "Feeling things out",
    "Not bad… keep going",
  ],
  "21-40": [
    "Now we're talking",
    "You've got her attention",
    "Something's building",
    "This is getting interesting",
  ],
  "41-60": [
    "Okay… now it's a vibe",
    "She's leaning in",
    "Momentum rising",
    "This could go somewhere",
  ],
  "61-80": [
    "Things are heating up",
    "You've definitely got her curious",
    "Now she's invested",
    "You're in dangerous territory",
  ],
  "81-100": [
    "Now you've really got her",
    "This is where things get interesting",
    "She's all in now",
    "Something special might happen",
    "Don't lose the momentum",
  ],
};

const DIP_PHRASES = {
  small: [
    "Careful… don't lose the vibe",
    "Momentum slipping",
    "Bring it back",
    "She almost had a moment there",
  ],
  big: [
    "Too eager… slow down",
    "That killed the mood",
    "Patience pays",
    "Build the moment",
  ],
  postReward: [
    "She left you wanting more",
    "Let it build again",
    "Round two starts now",
    "Don't rush the next moment",
  ],
};

const FORESHADOW_PHRASES = {
  "70+": [
    "She's about to show you something",
    "You're getting close",
    "Keep this energy",
    "One more good moment might do it",
  ],
  "85+": [
    "Something exclusive is coming",
    "Don't break the momentum now",
    "This is the sweet spot",
    "Stay with her",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getZoneKey(score: number): string {
  if (score >= 81) return "81-100";
  if (score >= 61) return "61-80";
  if (score >= 41) return "41-60";
  if (score >= 21) return "21-40";
  return "0-20";
}

export interface PhraseResult {
  phrase: string | null;
  type: "rising" | "dip" | "foreshadow" | null;
}

export function selectPhrase(
  previousScore: number,
  newScore: number,
  delta: number,
  justUnlockedReward: boolean,
): PhraseResult {
  const previousZone = getZoneKey(previousScore);
  const newZone = getZoneKey(newScore);
  const zoneChanged = previousZone !== newZone;

  // Foreshadow phrases (entering 85+ or 70+)
  if (newScore >= 85 && previousScore < 85) {
    return { phrase: pickRandom(FORESHADOW_PHRASES["85+"]), type: "foreshadow" };
  }
  if (newScore >= 70 && previousScore < 70) {
    return { phrase: pickRandom(FORESHADOW_PHRASES["70+"]), type: "foreshadow" };
  }

  // Dip phrases
  if (delta < -3) {
    if (justUnlockedReward) {
      return { phrase: pickRandom(DIP_PHRASES.postReward), type: "dip" };
    }
    if (delta < -5) {
      return { phrase: pickRandom(DIP_PHRASES.big), type: "dip" };
    }
    return { phrase: pickRandom(DIP_PHRASES.small), type: "dip" };
  }

  // Rising phrases (only on zone change or significant jump)
  if (delta > 3 && (zoneChanged || delta > 6)) {
    return { phrase: pickRandom(RISING_PHRASES[newZone] || RISING_PHRASES["0-20"]), type: "rising" };
  }

  return { phrase: null, type: null };
}

// ── Session management ──

export function isSessionExpired(lastActivityAt: string | null): boolean {
  if (!lastActivityAt) return true;
  return Date.now() - new Date(lastActivityAt).getTime() > SESSION_TIMEOUT_MS;
}

export function createFreshSessionState(): SessionState {
  return {
    visibleTension: SESSION_START_TENSION,
    qualityExchangeCount: 0,
    engagementStreak: 0,
    sessionStartedAt: Date.now(),
    premiumEventsThisSession: 0,
    lastPremiumEventAt: null,
    lastPremiumEventExchange: 0,
    exchangeCount: 0,
    clickedPreviousTeaser: false,
    openedMomentsShelf: false,
    spamCount: 0,
    lastEventTypeExchange: {},
  };
}

// ── Database operations ──

export interface TensionUpdateResult {
  previousScore: number;
  newScore: number;
  previousBand: TensionBand;
  newBand: TensionBand;
  delta: number;
  rewardTriggered: boolean;
  revealProbability: number;
  phrase: PhraseResult;
  premiumEvent: PremiumEventDecision;
  sessionState: SessionState;
}

export async function getOrCreateTensionState(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  conversationId: string,
) {
  const { data: existing } = await supabase
    .from("tension_state")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (existing) {
    // Check session expiry
    const expired = isSessionExpired(existing.updated_at);
    if (expired) {
      // Reset session
      const fresh = createFreshSessionState();
      await supabase
        .from("tension_state")
        .update({
          score: SESSION_START_TENSION,
          current_band: "warming_up" as TensionBand,
          session_message_count: 0,
          rewards_this_session: 0,
          session_started_at: new Date().toISOString(),
          conversation_id: conversationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return { ...existing, score: SESSION_START_TENSION, session_message_count: 0, rewards_this_session: 0, _sessionState: fresh };
    }

    // Restore session state from metadata or create fresh
    const sessionState: SessionState = existing.session_metadata
      ? (typeof existing.session_metadata === "string" ? JSON.parse(existing.session_metadata) : existing.session_metadata)
      : {
          ...createFreshSessionState(),
          visibleTension: Number(existing.score),
          exchangeCount: existing.session_message_count || 0,
        };

    return { ...existing, _sessionState: sessionState };
  }

  // Create new tension state
  const fresh = createFreshSessionState();
  const { data: created } = await supabase
    .from("tension_state")
    .insert({
      user_id: userId,
      persona_id: personaId,
      conversation_id: conversationId,
      score: SESSION_START_TENSION,
      current_band: "warming_up" as TensionBand,
      daily_streak: 1,
      last_active_date: new Date().toISOString().split("T")[0],
      session_started_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { ...(created || { score: SESSION_START_TENSION, session_message_count: 0, rewards_this_session: 0, peak_score: 0 }), _sessionState: fresh };
}

/**
 * Update tension after a user message + AI reply exchange
 */
export async function updateTension(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  conversationId: string,
  input: MessageAnalysis,
): Promise<TensionUpdateResult> {
  const state = await getOrCreateTensionState(supabase, userId, personaId, conversationId);
  const sessionState: SessionState = state._sessionState || createFreshSessionState();

  const previousScore = Number(state.score);
  const previousBand = getTensionBand(previousScore);

  // Calculate visible tension delta
  const { delta, reason } = calculateVisibleDelta(input);
  const newScore = Math.max(0, Math.min(100, previousScore + delta));
  const newBand = getTensionBand(newScore);

  // Update session state
  sessionState.visibleTension = newScore;
  sessionState.exchangeCount += 1;
  if (delta > 0) {
    sessionState.qualityExchangeCount += 1;
    sessionState.engagementStreak += 1;
  } else if (delta < -2) {
    sessionState.engagementStreak = 0;
  }
  if (input.isSpammy) sessionState.spamCount += 1;

  // Evaluate premium event (Layer B)
  const premiumEvent = evaluatePremiumEvent(sessionState);

  // If premium event triggered, record it
  if (premiumEvent.shouldTrigger && premiumEvent.eventType) {
    sessionState.premiumEventsThisSession += 1;
    sessionState.lastPremiumEventAt = Date.now();
    sessionState.lastPremiumEventExchange = sessionState.exchangeCount;
    sessionState.lastEventTypeExchange[premiumEvent.eventType] = sessionState.exchangeCount;
  }

  // Select cinematic phrase
  const phrase = selectPhrase(previousScore, newScore, delta, input.justUnlockedReward);

  // Persist to database
  const updatePayload: Record<string, unknown> = {
    score: newScore,
    current_band: newBand,
    peak_score: Math.max(Number(state.peak_score || 0), newScore),
    session_message_count: (state.session_message_count || 0) + 1,
    updated_at: new Date().toISOString(),
    session_metadata: sessionState,
  };

  if (premiumEvent.shouldTrigger) {
    updatePayload.last_reward_at = new Date().toISOString();
    updatePayload.rewards_this_session = (state.rewards_this_session || 0) + 1;
  }

  await supabase
    .from("tension_state")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("persona_id", personaId);

  // Log tension event (non-blocking)
  supabase.from("tension_events").insert({
    user_id: userId,
    persona_id: personaId,
    conversation_id: conversationId,
    event_type: premiumEvent.shouldTrigger ? "reward_triggered" : "message_sent",
    score_before: previousScore,
    score_after: newScore,
    score_delta: delta,
    band_before: previousBand,
    band_after: newBand,
    metadata: {
      reason,
      momentum: premiumEvent.momentum,
      premiumEventType: premiumEvent.eventType,
      forcedReason: premiumEvent.forcedReason,
      phrase: phrase.phrase,
      sessionExchangeCount: sessionState.exchangeCount,
    },
  });

  return {
    previousScore,
    newScore,
    previousBand,
    newBand,
    delta,
    rewardTriggered: premiumEvent.shouldTrigger,
    revealProbability: Math.min(premiumEvent.momentum / 120, 0.85),
    phrase,
    premiumEvent,
    sessionState,
  };
}

// ── Reward drop (call after user unlocks something) ──

export function calculateCooldownDrop(currentScore: number, _rewardBand: TensionBand): number {
  return Math.max(currentScore - 10, 0);
}

export function calculateRevealProbability(): number {
  return 0; // Deprecated — use evaluatePremiumEvent instead
}
