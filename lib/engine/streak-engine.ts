/**
 * Streak Engine
 *
 * Delivers a free moment when the user hits a configured day milestone
 * (3, 7, 14, 30, 60+) on their daily_streak with a persona. Once delivered
 * for that milestone, never re-delivered. Idempotent.
 *
 * The girl never says "streak reward" — she says something like "I've been
 * wanting to send you this 💜" using paraphrase guidance from the creator.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface StreakDelivery {
  rewardId: string;
  dayMilestone: number;
  momentId: string | null;
  momentTitle: string | null;
  momentMediaType: string | null;
  momentMediaUrl: string | null;
  momentThumbnailUrl: string | null;
  introLine: string;
  introMode: "exact" | "paraphrase" | "ai_generate";
}

interface StreakRewardRow {
  id: string;
  persona_id: string;
  day_milestone: number;
  moment_id: string | null;
  intro_line: string | null;
  intro_mode: string;
  is_active: boolean;
}

interface MomentRow {
  id: string;
  title: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
}

/**
 * Check if the user just hit a milestone on this turn. If yes and a reward
 * is configured, deliver it (atomically — unique constraint on
 * user/persona/milestone prevents double delivery).
 */
export async function maybeDeliverStreakReward(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
  currentStreakDays: number,
): Promise<StreakDelivery | null> {
  try {
    if (currentStreakDays < 1) return null;

    // Get all active rewards for this persona at or below current streak
    const { data: rewards } = await supabase
      .from("streak_rewards")
      .select("*")
      .eq("persona_id", personaId)
      .eq("is_active", true)
      .lte("day_milestone", currentStreakDays)
      .order("day_milestone", { ascending: false });

    if (!rewards || rewards.length === 0) return null;

    // Get already-delivered milestones for this user
    const { data: delivered } = await supabase
      .from("streak_reward_deliveries")
      .select("day_milestone")
      .eq("user_id", userId)
      .eq("persona_id", personaId);

    const deliveredSet = new Set(
      ((delivered || []) as { day_milestone: number }[]).map((d) => d.day_milestone),
    );

    // Find highest undelivered milestone
    const next = (rewards as StreakRewardRow[]).find(
      (r) => !deliveredSet.has(r.day_milestone),
    );
    if (!next) return null;

    let moment: MomentRow | null = null;
    if (next.moment_id) {
      const { data: m } = await supabase
        .from("moments")
        .select("id, title, media_type, media_url, thumbnail_url")
        .eq("id", next.moment_id)
        .single();
      moment = (m as MomentRow) || null;
    }

    // Atomic insert — unique constraint stops double delivery on race
    const { error: insertErr } = await supabase
      .from("streak_reward_deliveries")
      .insert({
        user_id: userId,
        persona_id: personaId,
        reward_id: next.id,
        day_milestone: next.day_milestone,
      });

    if (insertErr) {
      // Likely a unique-constraint violation (already delivered) — silent skip
      return null;
    }

    return {
      rewardId: next.id,
      dayMilestone: next.day_milestone,
      momentId: moment?.id ?? null,
      momentTitle: moment?.title ?? null,
      momentMediaType: moment?.media_type ?? null,
      momentMediaUrl: moment?.media_url ?? null,
      momentThumbnailUrl: moment?.thumbnail_url ?? null,
      introLine: next.intro_line || "I've been wanting to send you this 💜",
      introMode: (next.intro_mode as StreakDelivery["introMode"]) || "paraphrase",
    };
  } catch (e) {
    console.error("Streak engine error:", e);
    return null;
  }
}
