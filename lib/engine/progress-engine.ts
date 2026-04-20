/**
 * Hidden Progress Engine
 *
 * "Good effort always matters, even when no reward happens right away."
 *
 * This engine reads the recent XP and tension event streams to produce a
 * hidden boost value (0-1) that the Surprise Gesture system uses to decide
 * when a spontaneous gift is due. The user never sees any of this — but
 * their consistent good behaviour quietly raises the odds of a gesture.
 *
 * Inputs considered:
 *   - Mean quality score of their last N messages (via relationship_xp_events)
 *   - Consecutive good exchanges this session
 *   - Time since last gesture/reward delivered
 *   - Current relationship level (harder to please at higher levels)
 *   - Daily streak
 *
 * Output:
 *   - boost: 0..1 multiplier applied to the base gesture probability
 *   - rationale: human-readable breakdown for debugging
 *   - progressSummary: hidden fields like recent_good_count, last_gesture_ago_ms
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export interface HiddenProgress {
  boost: number;                  // 0..1
  rationale: string[];            // breakdown of contributions
  recentGoodMessages: number;     // count in last ~30 messages
  consecutiveGood: number;        // streak within the latest events
  avgRecentXp: number;            // mean XP over recent events
  millisSinceLastGesture: number | null;
  relationshipLevel: number;
  dailyStreakDays: number;
}

interface XpEvent { xp_awarded: number; leveled_up: boolean; created_at: string }
interface GestureEvent { created_at: string }

export async function computeHiddenProgress(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<HiddenProgress> {
  // Pull recent XP events (last 30).
  const { data: xpRows } = await supabase
    .from("relationship_xp_events")
    .select("xp_awarded, leveled_up, created_at")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(30);

  const xpEvents = (xpRows as XpEvent[]) || [];

  // Pull recent gesture events (reuses relationship_xp_events where leveled_up=true,
  // plus last_reward_at from tension_state as a proxy for any gesture).
  const { data: tensionState } = await supabase
    .from("tension_state")
    .select("last_reward_at, daily_streak")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  const { data: progressRow } = await supabase
    .from("user_relationship_progress")
    .select("current_level_number")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  const lastGestureTs = tensionState?.last_reward_at ? new Date(tensionState.last_reward_at).getTime() : null;
  const millisSinceLastGesture = lastGestureTs ? Date.now() - lastGestureTs : null;

  // Count "good" = xp >= 4 (empirical threshold; matches calculateXpForMessage mid-tier).
  const recentGood = xpEvents.filter(e => e.xp_awarded >= 4).length;
  let consecutiveGood = 0;
  for (const e of xpEvents) {
    if (e.xp_awarded >= 4) consecutiveGood++;
    else break;
  }
  const avgRecentXp = xpEvents.length > 0
    ? xpEvents.reduce((a, e) => a + e.xp_awarded, 0) / xpEvents.length
    : 0;

  const relationshipLevel = progressRow?.current_level_number || 1;
  const dailyStreakDays = tensionState?.daily_streak || 0;

  // ── Build boost ──
  let boost = 0;
  const rationale: string[] = [];

  // Consistency: many recent good messages → boost.
  if (recentGood >= 3) {
    const c = Math.min(0.3, (recentGood - 2) * 0.05);  // +0.05 per good beyond 2, cap 0.3
    boost += c;
    rationale.push(`recentGood=${recentGood} +${c.toFixed(2)}`);
  }

  // Streak within this session.
  if (consecutiveGood >= 3) {
    const c = Math.min(0.2, (consecutiveGood - 2) * 0.06);
    boost += c;
    rationale.push(`streak=${consecutiveGood} +${c.toFixed(2)}`);
  }

  // Average XP quality.
  if (avgRecentXp >= 5) {
    const c = Math.min(0.15, (avgRecentXp - 4) * 0.03);
    boost += c;
    rationale.push(`avgXp=${avgRecentXp.toFixed(1)} +${c.toFixed(2)}`);
  }

  // Long drought since last gesture → gentle boost (fairness).
  if (millisSinceLastGesture !== null && millisSinceLastGesture > 10 * 60_000) {
    const droughtMinutes = millisSinceLastGesture / 60_000;
    const c = Math.min(0.25, (droughtMinutes - 10) * 0.005);
    boost += c;
    rationale.push(`drought=${droughtMinutes.toFixed(0)}min +${c.toFixed(2)}`);
  } else if (millisSinceLastGesture === null) {
    // Never received a gesture — small boost.
    boost += 0.1;
    rationale.push(`no_prior_gesture +0.10`);
  }

  // Daily streak bonus.
  if (dailyStreakDays >= 3) {
    const c = Math.min(0.15, (dailyStreakDays - 2) * 0.02);
    boost += c;
    rationale.push(`streak_days=${dailyStreakDays} +${c.toFixed(2)}`);
  }

  // Cooldown suppression: if last gesture < 2 minutes ago, hard-block.
  if (millisSinceLastGesture !== null && millisSinceLastGesture < 120_000) {
    boost = 0;
    rationale.push("recent_gesture_cooldown → boost zeroed");
  }

  // Higher relationship level = bar is higher — slight dampener at very high levels.
  if (relationshipLevel >= 5) {
    const damp = 0.85;
    boost *= damp;
    rationale.push(`high_level_dampen x${damp}`);
  }

  boost = Math.max(0, Math.min(1, boost));

  return {
    boost: Math.round(boost * 1000) / 1000,
    rationale,
    recentGoodMessages: recentGood,
    consecutiveGood,
    avgRecentXp: Math.round(avgRecentXp * 10) / 10,
    millisSinceLastGesture,
    relationshipLevel,
    dailyStreakDays,
  };
}
