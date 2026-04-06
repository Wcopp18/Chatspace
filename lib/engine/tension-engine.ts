/**
 * Tension Engine — Core retention and reward mechanic
 *
 * Manages the dynamic tension meter that drives the build → reward → cooldown → rebuild loop.
 *
 * Bands:
 *   0-39  = warming_up
 *   40-69 = image_zone
 *   70-89 = premium_zone (premium image / rare selfie)
 *   90-100 = video_zone
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TensionBand } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

// ── Score computation inputs ──

interface TensionInput {
  messageLength: number;         // length of user message
  flirtIntensity: number;        // 0-1 based on keyword/emoji analysis
  toneMatch: number;             // 0-1 how well user matches persona tone
  responseSpeed: number;         // seconds since last message
  isRepetitive: boolean;         // user repeating themselves
  isOffTopic: boolean;           // user going off-topic
  personaMoodMultiplier: number; // persona-specific multiplier (0.5-2.0)
  recentUnlockCooldown: boolean; // if a reward was recently unlocked
  streakDays: number;            // daily streak count
  totalPurchases: number;        // total purchase count
}

interface TensionDelta {
  delta: number;
  reason: string;
}

// ── Band thresholds ──

export function getTensionBand(score: number): TensionBand {
  if (score >= 90) return "video_zone";
  if (score >= 70) return "premium_zone";
  if (score >= 40) return "image_zone";
  return "warming_up";
}

// ── Tension score calculation ──

export function calculateTensionDelta(input: TensionInput): TensionDelta {
  let delta = 0;
  const reasons: string[] = [];

  // Base gain from message length (short = less, medium = more, very long can mean real conversation = Claude territory)
  if (input.messageLength > 100) {
    delta += 3;
    reasons.push("long_message");
  } else if (input.messageLength > 30) {
    delta += 5;
    reasons.push("medium_message");
  } else if (input.messageLength > 10) {
    delta += 2;
    reasons.push("short_message");
  } else {
    delta += 0.5;
    reasons.push("minimal_message");
  }

  // Flirt intensity bonus (biggest factor)
  delta += input.flirtIntensity * 8;
  if (input.flirtIntensity > 0.5) reasons.push("high_flirt");

  // Tone match bonus
  delta += input.toneMatch * 3;

  // Response speed bonus (faster = more engaged)
  if (input.responseSpeed < 10) {
    delta += 3;
    reasons.push("fast_reply");
  } else if (input.responseSpeed < 30) {
    delta += 1.5;
  } else if (input.responseSpeed > 300) {
    delta -= 2;
    reasons.push("slow_reply");
  }

  // Penalties
  if (input.isRepetitive) {
    delta -= 4;
    reasons.push("repetitive_penalty");
  }

  if (input.isOffTopic) {
    delta -= 3;
    reasons.push("off_topic_penalty");
  }

  // Persona mood multiplier
  delta *= input.personaMoodMultiplier;

  // Recent unlock cooldown dampening
  if (input.recentUnlockCooldown) {
    delta *= 0.4;
    reasons.push("post_reward_cooldown");
  }

  // Streak bonus (small but compounds)
  if (input.streakDays >= 7) {
    delta *= 1.15;
    reasons.push("streak_bonus");
  } else if (input.streakDays >= 3) {
    delta *= 1.05;
  }

  // Purchase history bonus (loyal users build faster)
  if (input.totalPurchases >= 5) {
    delta *= 1.1;
    reasons.push("purchase_loyalty");
  }

  return {
    delta: Math.round(delta * 100) / 100,
    reason: reasons.join(","),
  };
}

// ── Flirt intensity analyzer ──

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

// ── Cooldown after reward ──

const REWARD_COOLDOWN_DROP: Record<TensionBand, number> = {
  warming_up: 0,
  image_zone: 24,    // Drop ~24 points after image reward
  premium_zone: 30,  // Drop ~30 after premium
  video_zone: 42,    // Drop ~42 after video (biggest reset)
};

export function calculateCooldownDrop(currentScore: number, rewardBand: TensionBand): number {
  const drop = REWARD_COOLDOWN_DROP[rewardBand];
  // Don't drop below 10 — always keep some warmth
  return Math.max(currentScore - drop, 10);
}

// ── Reveal probability ──

export function calculateRevealProbability(
  tensionScore: number,
  messageCount: number,
  lastRewardMinutesAgo: number | null,
  streakDays: number,
): number {
  // Must have minimum 10 messages
  if (messageCount < 10) return 0;

  // Base probability from tension score
  let baseProbability: number;
  if (tensionScore >= 90) baseProbability = 0.85;
  else if (tensionScore >= 70) baseProbability = 0.55;
  else if (tensionScore >= 40) baseProbability = 0.25;
  else baseProbability = 0.05;

  // Message count bonus (rises after 10)
  baseProbability += Math.min((messageCount - 10) * 0.02, 0.3);

  // Streak bonus
  const streakBonus = Math.min(streakDays * 0.01, 0.1);

  // Cooldown penalty (if reward was recent)
  let cooldownFactor = 1;
  if (lastRewardMinutesAgo !== null) {
    if (lastRewardMinutesAgo < 15) cooldownFactor = 0.1;
    else if (lastRewardMinutesAgo < 30) cooldownFactor = 0.5;
  }

  return Math.min((baseProbability + streakBonus) * cooldownFactor, 0.95);
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
}

/**
 * Get or create tension state for a user-persona pair
 */
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
    // Update streak if needed
    const today = new Date().toISOString().split("T")[0];
    const lastActive = existing.last_active_date;
    let streak = existing.daily_streak;

    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      streak = lastActive === yesterday ? streak + 1 : 1;

      await supabase
        .from("tension_state")
        .update({
          daily_streak: streak,
          last_active_date: today,
          conversation_id: conversationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }

    return { ...existing, daily_streak: streak };
  }

  // Create new tension state
  const today = new Date().toISOString().split("T")[0];
  const { data: created } = await supabase
    .from("tension_state")
    .insert({
      user_id: userId,
      persona_id: personaId,
      conversation_id: conversationId,
      score: 0,
      current_band: "warming_up" as TensionBand,
      daily_streak: 1,
      last_active_date: today,
    })
    .select()
    .single();

  return created!;
}

/**
 * Update tension after a user message + AI reply exchange
 */
export async function updateTension(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  conversationId: string,
  input: TensionInput,
): Promise<TensionUpdateResult> {
  const state = await getOrCreateTensionState(supabase, userId, personaId, conversationId);

  const previousScore = Number(state.score);
  const previousBand = state.current_band as TensionBand;

  const { delta, reason } = calculateTensionDelta(input);
  const rawScore = previousScore + delta;
  const newScore = Math.max(0, Math.min(100, rawScore));
  const newBand = getTensionBand(newScore);

  // Calculate reveal probability
  const lastRewardAt = state.last_reward_at ? new Date(state.last_reward_at) : null;
  const lastRewardMinutesAgo = lastRewardAt
    ? (Date.now() - lastRewardAt.getTime()) / 60000
    : null;

  const revealProbability = calculateRevealProbability(
    newScore,
    state.session_message_count + 1,
    lastRewardMinutesAgo,
    state.daily_streak,
  );

  // Check if we should trigger a reward
  const rewardTriggered = revealProbability > 0 && Math.random() < revealProbability;

  // If reward triggered, apply cooldown drop
  let finalScore = newScore;
  let finalBand = newBand;
  if (rewardTriggered) {
    finalScore = calculateCooldownDrop(newScore, newBand);
    finalBand = getTensionBand(finalScore);
  }

  // Update tension state
  await supabase
    .from("tension_state")
    .update({
      score: finalScore,
      current_band: finalBand,
      peak_score: Math.max(Number(state.peak_score), newScore),
      session_message_count: state.session_message_count + 1,
      ...(rewardTriggered
        ? {
            last_reward_at: new Date().toISOString(),
            rewards_this_session: state.rewards_this_session + 1,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("persona_id", personaId);

  // Log the tension event
  await supabase.from("tension_events").insert({
    user_id: userId,
    persona_id: personaId,
    conversation_id: conversationId,
    event_type: rewardTriggered ? "reward_triggered" : "message_sent",
    score_before: previousScore,
    score_after: finalScore,
    score_delta: delta,
    band_before: previousBand,
    band_after: finalBand,
    metadata: { reason, reveal_probability: revealProbability },
  });

  return {
    previousScore,
    newScore: finalScore,
    previousBand,
    newBand: finalBand,
    delta,
    rewardTriggered,
    revealProbability,
  };
}
