/**
 * Surprise Gesture System
 *
 * Creates special moments: free image, free video, special note,
 * daily bundle, or surprise gesture.
 *
 * Triggers based on relationship stage, daily vibe, chemistry,
 * cooldowns, and hidden variance.
 *
 * Rewards feel earned, thoughtful, and spontaneous — not mechanical.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChemistryState } from "./session-chemistry";
import type { DailyVibe } from "./daily-vibe";
import type { HiddenProgressState } from "./hidden-progress";
import type { LevelReward } from "./relationship-levels";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export type GestureType = "free_image" | "free_video" | "special_note" | "daily_bundle" | "surprise_moment";

export interface SurpriseGesture {
  shouldTrigger: boolean;
  gestureType: GestureType | null;
  triggerReason: string | null;
  reward: LevelReward | null;
  cooldownMinutes: number;
}

// ── Cooldown constants ──

const COOLDOWNS: Record<GestureType, number> = {
  free_image: 60,        // 1 hour
  free_video: 180,       // 3 hours
  special_note: 30,      // 30 minutes
  daily_bundle: 360,     // 6 hours
  surprise_moment: 120,  // 2 hours
};

const MAX_SURPRISES_PER_DAY = 3;

// ── Check eligibility and decide on a surprise ──

export async function evaluateSurpriseGesture(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  context: {
    relationshipLevel: number;
    chemistry: ChemistryState;
    dailyVibe: DailyVibe;
    hiddenProgress: HiddenProgressState;
    messageCount: number;
  },
): Promise<SurpriseGesture> {
  const { relationshipLevel, chemistry, dailyVibe, hiddenProgress, messageCount } = context;

  const noTrigger: SurpriseGesture = {
    shouldTrigger: false,
    gestureType: null,
    triggerReason: null,
    reward: null,
    cooldownMinutes: 0,
  };

  // ── Hard blocks ──

  // Must have at least 5 messages in conversation
  if (messageCount < 5) return noTrigger;

  // Check daily limit
  const today = new Date().toISOString().split("T")[0];
  const { data: todaySurprises } = await supabase
    .from("surprise_gestures")
    .select("id")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .gte("delivered_at", `${today}T00:00:00`)
    .lte("delivered_at", `${today}T23:59:59`);

  if ((todaySurprises?.length || 0) >= MAX_SURPRISES_PER_DAY) return noTrigger;

  // Check cooldown from last surprise
  const { data: lastSurprise } = await supabase
    .from("surprise_gestures")
    .select("delivered_at, gesture_type")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("delivered_at", { ascending: false })
    .limit(1)
    .single();

  if (lastSurprise) {
    const minutesSinceLast = (Date.now() - new Date(lastSurprise.delivered_at).getTime()) / 60000;
    const cooldownForType = COOLDOWNS[lastSurprise.gesture_type as GestureType] || 60;
    if (minutesSinceLast < cooldownForType) return noTrigger;
  }

  // ── Calculate trigger probability ──

  let probability = 0;
  let triggerReason = "";

  // Base probability from hidden progress surprise readiness
  probability += hiddenProgress.surpriseReadiness / 200; // 0-0.5 from readiness

  // Chemistry boost
  if (chemistry.zone === "on_fire") {
    probability += 0.2;
    triggerReason = "chemistry_peak";
  } else if (chemistry.zone === "hot") {
    probability += 0.1;
    triggerReason = triggerReason || "high_chemistry";
  }

  // Daily vibe influence
  if (dailyVibe.vibe === "affectionate" || dailyVibe.vibe === "excited") {
    probability += 0.08;
    triggerReason = triggerReason || "daily_vibe";
  }
  if (dailyVibe.vibe === "vulnerable") {
    probability += 0.06;
    triggerReason = triggerReason || "vulnerable_vibe";
  }

  // Relationship level boost (deeper = more surprises)
  probability += Math.min(relationshipLevel * 0.02, 0.12);

  // Reward boost from hidden progress (builds over time without rewards)
  probability += hiddenProgress.nextRewardBoost * 0.15;

  // Anti-gaming penalties
  probability -= hiddenProgress.repetitionPenalty * 0.15;
  probability -= hiddenProgress.burstPenalty * 0.2;

  // Message count since last reward bonus
  if (hiddenProgress.messagesSinceLastReward > 20) {
    probability += 0.1;
    triggerReason = triggerReason || "earned_through_effort";
  }

  // Cap probability
  probability = Math.max(0, Math.min(0.85, probability));

  // Roll the dice
  if (Math.random() > probability) return noTrigger;

  // ── Select gesture type ──

  const gestureType = selectGestureType(relationshipLevel, chemistry, dailyVibe);

  // ── Find a reward to deliver ──

  let reward: LevelReward | null = null;

  // Try to find an unclaimed reward from current or previous levels
  const { data: unclaimedRewards } = await supabase
    .from("relationship_level_rewards")
    .select(`
      *,
      relationship_levels!inner(level_number, persona_id)
    `)
    .eq("persona_id", personaId)
    .eq("is_active", true)
    .lte("relationship_levels.level_number", relationshipLevel)
    .order("sort_order", { ascending: true })
    .limit(10);

  if (unclaimedRewards && unclaimedRewards.length > 0) {
    // Check which ones the user hasn't claimed
    const { data: claims } = await supabase
      .from("user_level_reward_claims")
      .select("reward_id")
      .eq("user_id", userId)
      .eq("persona_id", personaId);

    const claimedIds = new Set((claims || []).map((c: { reward_id: string }) => c.reward_id));
    const unclaimed = unclaimedRewards.filter((r: { id: string }) => !claimedIds.has(r.id));

    if (unclaimed.length > 0) {
      // Filter by gesture type matching media type
      const matchingType = gestureType === "free_video" ? "video" :
                          gestureType === "special_note" ? "note" : "image";
      const matching = unclaimed.filter((r: { media_type: string }) => r.media_type === matchingType);
      const selected = matching.length > 0 ? matching[0] : unclaimed[0];

      reward = {
        id: selected.id,
        levelId: selected.level_id,
        personaId: selected.persona_id,
        mediaType: selected.media_type,
        mediaUrl: selected.media_url,
        thumbnailUrl: selected.thumbnail_url,
        caption: selected.caption,
        sortOrder: selected.sort_order,
      };
    }
  }

  // Record the gesture
  await supabase.from("surprise_gestures").insert({
    user_id: userId,
    persona_id: personaId,
    gesture_type: gestureType,
    reward_id: reward?.id || null,
    trigger_reason: triggerReason || "random_kindness",
    relationship_level: relationshipLevel,
    chemistry_score: chemistry.score,
    daily_vibe: dailyVibe.vibe,
    cooldown_until: new Date(Date.now() + COOLDOWNS[gestureType] * 60000).toISOString(),
  });

  return {
    shouldTrigger: true,
    gestureType,
    triggerReason: triggerReason || "random_kindness",
    reward,
    cooldownMinutes: COOLDOWNS[gestureType],
  };
}

// ── Select gesture type based on context ──

function selectGestureType(
  level: number,
  chemistry: ChemistryState,
  vibe: DailyVibe,
): GestureType {
  const weights: Record<GestureType, number> = {
    free_image: 30,
    free_video: level >= 4 ? 15 : 5,
    special_note: 25,
    daily_bundle: level >= 3 ? 10 : 0,
    surprise_moment: chemistry.zone === "on_fire" ? 20 : 10,
  };

  // Vibe adjustments
  if (vibe.vibe === "vulnerable" || vibe.vibe === "affectionate") {
    weights.special_note += 15;
  }
  if (vibe.vibe === "flirty" || vibe.vibe === "excited") {
    weights.free_image += 10;
    weights.free_video += 5;
  }

  // High chemistry boosts rarer gestures
  if (chemistry.zone === "on_fire") {
    weights.free_video += 10;
    weights.daily_bundle += 10;
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return type as GestureType;
  }

  return "free_image";
}
