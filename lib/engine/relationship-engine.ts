/**
 * Relationship Engine — long-term relationship level progression.
 *
 * Unlike the session-scoped tension meter, this engine tracks a persistent
 * per-(user, persona) bond that only grows over time. The creator defines
 * an ordered list of "levels" with catchy names (Stranger → Obsessed …).
 * Each level has an `xp_to_complete` goal. When a user fills that goal,
 * they level up and receive all configured `relationship_level_rewards`
 * (free images/videos the creator uploaded for that level).
 *
 * XP is earned from message quality — reuses the same `MessageAnalysis`
 * signals as the tension engine, but only grants positive XP (no decay).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageAnalysis } from "./tension-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

// ── Types ──

export interface RelationshipLevel {
  id: string;
  persona_id: string;
  level_number: number;
  name: string;
  description: string | null;
  xp_to_complete: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
}

export interface RelationshipLevelReward {
  id: string;
  level_id: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface UserRelationshipProgress {
  id: string;
  user_id: string;
  persona_id: string;
  total_xp_earned: number;
  current_level_number: number;
  xp_into_current_level: number;
  highest_level_reached: number;
  last_level_up_at: string | null;
}

export interface DeliveredReward {
  id: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  level_id: string;
  level_name: string;
  level_number: number;
}

export interface XpAwardResult {
  xpAwarded: number;
  totalXp: number;
  xpIntoCurrentLevel: number;
  currentLevel: RelationshipLevel | null;
  nextLevel: RelationshipLevel | null;
  currentLevelNumber: number;
  progressPct: number;              // 0-100, fill of current level's bar
  leveledUp: boolean;
  levelsGainedThisCall: number;
  levelUpSummaries: Array<{ fromLevel: number; toLevel: number; levelName: string }>;
  rewardsDelivered: DeliveredReward[];
  reason: string;
}

// ── XP calculation (positive-only; long-term accrual) ──

export function calculateXpForMessage(analysis: MessageAnalysis): { xp: number; reason: string } {
  // Anti-gaming: spam/demanding/mood-breaking = zero XP (not negative — no loss for long-term track)
  if (analysis.isSpammy || analysis.isDemanding || analysis.isMoodBreaking) {
    return { xp: 0, reason: "low_quality_rejected" };
  }

  let xp = 0;
  const reasons: string[] = [];

  // Base XP for a non-dry, non-spam exchange.
  if (!analysis.isDry) {
    xp += 2;
    reasons.push("exchange");
  }

  // Flirt bonus (cap at +4).
  if (analysis.flirtIntensity > 0.2) {
    xp += Math.round(1 + analysis.flirtIntensity * 3);
    reasons.push("flirty");
  }

  // Emotional openness (cap at +5) — rewards real vulnerability.
  if (analysis.emotionalOpenness > 0.3) {
    xp += Math.round(2 + analysis.emotionalOpenness * 3);
    reasons.push("openness");
  }

  // High-investment long-form message.
  if (analysis.isHighInvestment) {
    xp += 3;
    reasons.push("investment");
  }

  // Small length-based bump so effort is rewarded.
  if (analysis.messageLength >= 40) {
    xp += 1;
    reasons.push("length");
  }

  // Passive/delayed messages still earn a little.
  if (xp === 0 && !analysis.isDry) {
    xp = 1;
    reasons.push("min");
  }

  return { xp, reason: reasons.join(",") };
}

// ── Level lookup / progress math ──

export async function getActiveLevels(
  supabase: SupabaseAny,
  personaId: string,
): Promise<RelationshipLevel[]> {
  const { data } = await supabase
    .from("relationship_levels")
    .select("*")
    .eq("persona_id", personaId)
    .eq("is_active", true)
    .order("level_number", { ascending: true });
  return (data || []) as RelationshipLevel[];
}

export async function getOrCreateProgress(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<UserRelationshipProgress> {
  const { data: existing } = await supabase
    .from("user_relationship_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (existing) return existing as UserRelationshipProgress;

  const { data: created } = await supabase
    .from("user_relationship_progress")
    .insert({
      user_id: userId,
      persona_id: personaId,
      total_xp_earned: 0,
      current_level_number: 1,
      xp_into_current_level: 0,
      highest_level_reached: 1,
    })
    .select()
    .single();

  return created as UserRelationshipProgress;
}

function findLevel(levels: RelationshipLevel[], number: number): RelationshipLevel | null {
  return levels.find(l => l.level_number === number) || null;
}

// ── Core award function ──

export async function awardRelationshipXp(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  xpToAward: number,
  reason: string,
): Promise<XpAwardResult> {
  const levels = await getActiveLevels(supabase, personaId);
  const progress = await getOrCreateProgress(supabase, userId, personaId);

  const beforeLevelNumber = progress.current_level_number;

  // If no levels configured, nothing we can do except record the XP.
  if (levels.length === 0) {
    const newTotal = progress.total_xp_earned + xpToAward;
    await supabase
      .from("user_relationship_progress")
      .update({
        total_xp_earned: newTotal,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", progress.id);

    return {
      xpAwarded: xpToAward,
      totalXp: newTotal,
      xpIntoCurrentLevel: 0,
      currentLevel: null,
      nextLevel: null,
      currentLevelNumber: progress.current_level_number,
      progressPct: 0,
      leveledUp: false,
      levelsGainedThisCall: 0,
      levelUpSummaries: [],
      rewardsDelivered: [],
      reason,
    };
  }

  // Walk the level ladder.
  const maxLevelNumber = levels[levels.length - 1].level_number;
  let currentLevelNumber = progress.current_level_number;
  let xpIntoCurrent = progress.xp_into_current_level + xpToAward;

  const levelUpSummaries: Array<{ fromLevel: number; toLevel: number; levelName: string }> = [];
  const rewardsToDeliver: Array<{ levelId: string; levelName: string; levelNumber: number }> = [];

  while (true) {
    const current = findLevel(levels, currentLevelNumber);
    if (!current) break;

    // At max level: cap overflow so the bar shows full.
    if (currentLevelNumber >= maxLevelNumber) {
      if (xpIntoCurrent > current.xp_to_complete) xpIntoCurrent = current.xp_to_complete;
      break;
    }

    if (xpIntoCurrent < current.xp_to_complete) break;

    // Level up!
    xpIntoCurrent -= current.xp_to_complete;
    const next = findLevel(levels, currentLevelNumber + 1);
    levelUpSummaries.push({
      fromLevel: currentLevelNumber,
      toLevel: currentLevelNumber + 1,
      levelName: next?.name || current.name,
    });
    // Queue rewards for the level we just completed (current level).
    rewardsToDeliver.push({ levelId: current.id, levelName: current.name, levelNumber: current.level_number });
    currentLevelNumber += 1;
  }

  // Deliver rewards for each completed level (deduped against prior claims).
  const deliveredRewards: DeliveredReward[] = [];
  for (const entry of rewardsToDeliver) {
    const delivered = await deliverRewardsForLevel(supabase, userId, personaId, entry.levelId, entry.levelName, entry.levelNumber);
    deliveredRewards.push(...delivered);
  }

  const newTotalXp = progress.total_xp_earned + xpToAward;
  const newHighestLevel = Math.max(progress.highest_level_reached, currentLevelNumber);
  const leveledUp = levelUpSummaries.length > 0;

  await supabase
    .from("user_relationship_progress")
    .update({
      total_xp_earned: newTotalXp,
      current_level_number: currentLevelNumber,
      xp_into_current_level: xpIntoCurrent,
      highest_level_reached: newHighestLevel,
      last_message_at: new Date().toISOString(),
      last_level_up_at: leveledUp ? new Date().toISOString() : progress.last_level_up_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", progress.id);

  // Log event (non-blocking).
  supabase.from("relationship_xp_events").insert({
    user_id: userId,
    persona_id: personaId,
    xp_awarded: xpToAward,
    reason,
    level_before: beforeLevelNumber,
    level_after: currentLevelNumber,
    leveled_up: leveledUp,
    metadata: { rewardCount: deliveredRewards.length },
  });

  const currentLevel = findLevel(levels, currentLevelNumber);
  const nextLevel = findLevel(levels, currentLevelNumber + 1);
  const progressPct = currentLevel
    ? Math.min(100, Math.round((xpIntoCurrent / currentLevel.xp_to_complete) * 100))
    : 100;

  return {
    xpAwarded: xpToAward,
    totalXp: newTotalXp,
    xpIntoCurrentLevel: xpIntoCurrent,
    currentLevel,
    nextLevel,
    currentLevelNumber,
    progressPct,
    leveledUp,
    levelsGainedThisCall: levelUpSummaries.length,
    levelUpSummaries,
    rewardsDelivered: deliveredRewards,
    reason,
  };
}

// ── Reward delivery ──

async function deliverRewardsForLevel(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  levelId: string,
  levelName: string,
  levelNumber: number,
): Promise<DeliveredReward[]> {
  const { data: rewards } = await supabase
    .from("relationship_level_rewards")
    .select("*")
    .eq("level_id", levelId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!rewards || rewards.length === 0) return [];

  // Dedupe against any prior claims (user should never get the same reward twice).
  const rewardIds = rewards.map((r: { id: string }) => r.id);
  const { data: priorClaims } = await supabase
    .from("user_level_reward_claims")
    .select("reward_id")
    .eq("user_id", userId)
    .in("reward_id", rewardIds);

  const alreadyClaimed = new Set((priorClaims || []).map((c: { reward_id: string }) => c.reward_id));
  const fresh = (rewards as RelationshipLevelReward[]).filter(r => !alreadyClaimed.has(r.id));
  if (fresh.length === 0) return [];

  const now = new Date().toISOString();
  await supabase.from("user_level_reward_claims").insert(
    fresh.map(r => ({
      user_id: userId,
      reward_id: r.id,
      level_id: levelId,
      persona_id: personaId,
      delivered_at: now,
    })),
  );

  return fresh.map(r => ({
    id: r.id,
    media_type: r.media_type,
    media_url: r.media_url,
    thumbnail_url: r.thumbnail_url,
    caption: r.caption,
    level_id: levelId,
    level_name: levelName,
    level_number: levelNumber,
  }));
}

// ── Convenience: summary for UI ──

export interface RelationshipSnapshot {
  currentLevelNumber: number;
  currentLevelName: string;
  currentLevelIcon: string | null;
  currentLevelColor: string | null;
  currentLevelDescription: string | null;
  xpIntoCurrentLevel: number;
  xpToComplete: number;
  progressPct: number;
  nextLevelName: string | null;
  nextLevelNumber: number | null;
  highestLevelReached: number;
  totalXpEarned: number;
  isMaxLevel: boolean;
}

export async function getRelationshipSnapshot(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<RelationshipSnapshot | null> {
  const levels = await getActiveLevels(supabase, personaId);
  if (levels.length === 0) return null;
  const progress = await getOrCreateProgress(supabase, userId, personaId);

  const current = findLevel(levels, progress.current_level_number) || levels[0];
  const next = findLevel(levels, progress.current_level_number + 1);
  const isMaxLevel = !next;
  const xpToComplete = current.xp_to_complete;
  const xpInto = Math.min(progress.xp_into_current_level, xpToComplete);
  const progressPct = xpToComplete > 0 ? Math.round((xpInto / xpToComplete) * 100) : 100;

  return {
    currentLevelNumber: current.level_number,
    currentLevelName: current.name,
    currentLevelIcon: current.icon,
    currentLevelColor: current.color,
    currentLevelDescription: current.description,
    xpIntoCurrentLevel: xpInto,
    xpToComplete,
    progressPct: isMaxLevel ? 100 : progressPct,
    nextLevelName: next?.name || null,
    nextLevelNumber: next?.level_number || null,
    highestLevelReached: progress.highest_level_reached,
    totalXpEarned: progress.total_xp_earned,
    isMaxLevel,
  };
}
