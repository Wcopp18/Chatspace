/**
 * First-Reveal Subscription Trigger
 *
 * Decides when to surface the "you've earned this" subscription prompt.
 * The prompt fires only when the user has built genuine chemistry — high
 * session chemistry, positive streak, quality messages, positive long-term
 * momentum, and no recent dismissal cooldown. Abuse signals block it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChemistryState } from "./session-chemistry";
import type { HiddenProgressState } from "./hidden-progress";
import type { MessageQualityResult, QualityLabel } from "./message-quality";
import type { AntiGamingResult } from "./anti-gaming";

export interface FirstRevealContext {
  isSubscribed: boolean;
  dismissedUntil: Date | null;
  chemistry: ChemistryState;
  hiddenProgress: HiddenProgressState;
  messageQuality: MessageQualityResult;
  antiGaming: AntiGamingResult;
  totalMessagesSent: number;
}

export interface FirstRevealDecision {
  shouldTrigger: boolean;
  reason: string;
  leadIn: string | null;
}

export const FIRST_REVEAL_THRESHOLDS = {
  chemistryScore: 70,
  positiveStreak: 3,
  relationshipMomentum: 40,
  minMessagesSent: 8,
  maxBurstPenalty: 0.3,
  dismissCooldownHours: 24,
};

const LEAD_IN_LINES = [
  "okay... you've earned this 💗",
  "you've been really sweet tonight... i want to show you something.",
  "i was going to keep this to myself, but you deserve to see it.",
  "only because it's you... look what i was about to send.",
  "i don't usually do this... but i trust you.",
];

export function selectLeadIn(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return LEAD_IN_LINES[Math.abs(hash) % LEAD_IN_LINES.length];
}

export function evaluateFirstReveal(ctx: FirstRevealContext): FirstRevealDecision {
  if (ctx.isSubscribed) {
    return { shouldTrigger: false, reason: "already_subscribed", leadIn: null };
  }
  if (ctx.dismissedUntil && ctx.dismissedUntil.getTime() > Date.now()) {
    return { shouldTrigger: false, reason: "dismiss_cooldown_active", leadIn: null };
  }
  if (ctx.totalMessagesSent < FIRST_REVEAL_THRESHOLDS.minMessagesSent) {
    return { shouldTrigger: false, reason: "insufficient_messages", leadIn: null };
  }
  if (ctx.chemistry.score < FIRST_REVEAL_THRESHOLDS.chemistryScore) {
    return { shouldTrigger: false, reason: "low_chemistry", leadIn: null };
  }
  if (ctx.chemistry.positiveStreak < FIRST_REVEAL_THRESHOLDS.positiveStreak) {
    return { shouldTrigger: false, reason: "no_streak", leadIn: null };
  }
  if (ctx.hiddenProgress.relationshipMomentum < FIRST_REVEAL_THRESHOLDS.relationshipMomentum) {
    return { shouldTrigger: false, reason: "weak_momentum", leadIn: null };
  }
  const qualityLabel: QualityLabel = ctx.messageQuality.label;
  if (qualityLabel === "low") {
    return { shouldTrigger: false, reason: "low_quality_message", leadIn: null };
  }
  if (ctx.antiGaming.state.burstPenalty > FIRST_REVEAL_THRESHOLDS.maxBurstPenalty) {
    return { shouldTrigger: false, reason: "anti_gaming_burst", leadIn: null };
  }
  return { shouldTrigger: true, reason: "earned", leadIn: null };
}

export interface PromptEventInput {
  userId: string;
  personaId: string;
  conversationId: string | null;
  eventType: "impression" | "dismiss" | "click" | "trial_start" | "reveal";
  chemistryScore?: number;
  tensionScore?: number;
  relationshipMomentum?: number;
  messageQualityLabel?: string;
  context?: Record<string, unknown>;
}

export async function recordPromptEvent(
  supabase: SupabaseClient,
  input: PromptEventInput,
): Promise<void> {
  await supabase.from("subscription_prompt_events").insert({
    user_id: input.userId,
    persona_id: input.personaId,
    conversation_id: input.conversationId,
    event_type: input.eventType,
    chemistry_score: input.chemistryScore ?? null,
    tension_score: input.tensionScore ?? null,
    relationship_momentum: input.relationshipMomentum ?? null,
    message_quality_label: input.messageQualityLabel ?? null,
    context: input.context ?? {},
  }).then(() => {}, (e: unknown) => console.error("Prompt event log error:", e));
}

export async function getProfileSubscriptionState(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ isSubscribed: boolean; dismissedUntil: Date | null; firstPromptAt: Date | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("is_subscribed, subscription_dismissed_until, first_subscription_prompt_at")
    .eq("id", userId)
    .single();
  if (!data) return { isSubscribed: false, dismissedUntil: null, firstPromptAt: null };
  const row = data as {
    is_subscribed: boolean;
    subscription_dismissed_until: string | null;
    first_subscription_prompt_at: string | null;
  };
  return {
    isSubscribed: row.is_subscribed,
    dismissedUntil: row.subscription_dismissed_until ? new Date(row.subscription_dismissed_until) : null,
    firstPromptAt: row.first_subscription_prompt_at ? new Date(row.first_subscription_prompt_at) : null,
  };
}
