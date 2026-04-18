/**
 * Hidden Progress System
 *
 * Invisible system ensuring good effort always matters,
 * even when no reward happens right away.
 *
 * Updates relationship score, chemistry, and future reward odds
 * after good messages. User never directly sees this.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageQualityResult } from "./message-quality";
import type { ChemistryState } from "./session-chemistry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export interface HiddenProgressState {
  relationshipMomentum: number;  // 0-100
  consistencyScore: number;      // 0-100
  surpriseReadiness: number;     // 0-100
  nextRewardBoost: number;       // 0-1
  consecutiveGoodDays: number;
  totalGoodSessions: number;
  messagesSinceLastReward: number;
  daysSinceLastReward: number;
  repetitionPenalty: number;     // 0-1
  burstPenalty: number;          // 0-1
  topicDiversityScore: number;  // 0-1
}

// ── Get or create hidden progress ──

export async function getOrCreateHiddenProgress(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<HiddenProgressState> {
  const { data: existing } = await supabase
    .from("hidden_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (existing) {
    return {
      relationshipMomentum: Number(existing.relationship_momentum),
      consistencyScore: Number(existing.consistency_score),
      surpriseReadiness: Number(existing.surprise_readiness),
      nextRewardBoost: Number(existing.next_reward_boost),
      consecutiveGoodDays: existing.consecutive_good_days,
      totalGoodSessions: existing.total_good_sessions,
      messagesSinceLastReward: existing.messages_since_last_reward,
      daysSinceLastReward: existing.days_since_last_reward,
      repetitionPenalty: Number(existing.repetition_penalty),
      burstPenalty: Number(existing.burst_penalty),
      topicDiversityScore: Number(existing.topic_diversity_score),
    };
  }

  // Create fresh
  const fresh: HiddenProgressState = {
    relationshipMomentum: 0,
    consistencyScore: 0,
    surpriseReadiness: 0,
    nextRewardBoost: 0,
    consecutiveGoodDays: 0,
    totalGoodSessions: 0,
    messagesSinceLastReward: 0,
    daysSinceLastReward: 0,
    repetitionPenalty: 0,
    burstPenalty: 0,
    topicDiversityScore: 0.5,
  };

  await supabase.from("hidden_progress").insert({
    user_id: userId,
    persona_id: personaId,
  });

  return fresh;
}

// ── Update hidden progress after a message ──

export async function updateHiddenProgress(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  quality: MessageQualityResult,
  chemistry: ChemistryState,
  antiGaming: { repetitionPenalty: number; burstPenalty: number; topicDiversity: number },
): Promise<HiddenProgressState> {
  const current = await getOrCreateHiddenProgress(supabase, userId, personaId);

  // ── Relationship momentum ──
  // Slowly builds over time with quality interactions
  let momentumDelta = 0;
  if (quality.label === "high") momentumDelta = 2 + quality.score * 3;
  else if (quality.label === "medium") momentumDelta = 0.5 + quality.score;
  else momentumDelta = -1;

  // Chemistry bonus
  if (chemistry.zone === "on_fire") momentumDelta += 1.5;
  else if (chemistry.zone === "hot") momentumDelta += 0.8;

  // Anti-gaming penalties
  momentumDelta -= antiGaming.repetitionPenalty * 2;
  momentumDelta -= antiGaming.burstPenalty * 3;

  const newMomentum = Math.max(0, Math.min(100, current.relationshipMomentum + momentumDelta));

  // ── Consistency score ──
  // Rewards showing up regularly
  const consistencyDelta = quality.label !== "low" ? 0.5 : -0.3;
  const newConsistency = Math.max(0, Math.min(100, current.consistencyScore + consistencyDelta));

  // ── Surprise readiness ──
  // Builds toward the next surprise gesture
  let surpriseDelta = 0;
  if (quality.label === "high") surpriseDelta = 3 + Math.random() * 2;
  else if (quality.label === "medium") surpriseDelta = 1 + Math.random();
  else surpriseDelta = 0.2; // Even low quality slowly builds (prevents frustration)

  // Bonus for high chemistry
  if (chemistry.score > 70) surpriseDelta *= 1.3;

  // Topic diversity bonus
  surpriseDelta *= (0.7 + antiGaming.topicDiversity * 0.6);

  const newSurpriseReadiness = Math.min(100, current.surpriseReadiness + surpriseDelta);

  // ── Next reward boost ──
  // The longer without a reward, the higher the boost
  const newMessagesSinceReward = current.messagesSinceLastReward + 1;
  const newRewardBoost = Math.min(1.0,
    current.nextRewardBoost + (quality.label === "high" ? 0.03 : quality.label === "medium" ? 0.01 : 0)
  );

  // Persist
  await supabase
    .from("hidden_progress")
    .upsert({
      user_id: userId,
      persona_id: personaId,
      relationship_momentum: newMomentum,
      consistency_score: newConsistency,
      surprise_readiness: newSurpriseReadiness,
      next_reward_boost: newRewardBoost,
      consecutive_good_days: current.consecutiveGoodDays,
      total_good_sessions: quality.label === "high" ? current.totalGoodSessions + 1 : current.totalGoodSessions,
      messages_since_last_reward: newMessagesSinceReward,
      days_since_last_reward: current.daysSinceLastReward,
      repetition_penalty: antiGaming.repetitionPenalty,
      burst_penalty: antiGaming.burstPenalty,
      topic_diversity_score: antiGaming.topicDiversity,
      last_good_message_at: quality.label !== "low" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,persona_id" });

  return {
    relationshipMomentum: newMomentum,
    consistencyScore: newConsistency,
    surpriseReadiness: newSurpriseReadiness,
    nextRewardBoost: newRewardBoost,
    consecutiveGoodDays: current.consecutiveGoodDays,
    totalGoodSessions: quality.label === "high" ? current.totalGoodSessions + 1 : current.totalGoodSessions,
    messagesSinceLastReward: newMessagesSinceReward,
    daysSinceLastReward: current.daysSinceLastReward,
    repetitionPenalty: antiGaming.repetitionPenalty,
    burstPenalty: antiGaming.burstPenalty,
    topicDiversityScore: antiGaming.topicDiversity,
  };
}

// ── Reset surprise readiness after a surprise is delivered ──

export async function recordSurpriseDelivered(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<void> {
  await supabase
    .from("hidden_progress")
    .update({
      surprise_readiness: 0,
      next_reward_boost: 0,
      messages_since_last_reward: 0,
      last_reward_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("persona_id", personaId);
}
