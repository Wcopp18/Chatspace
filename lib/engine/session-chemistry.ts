/**
 * Session Chemistry System
 *
 * How well the current conversation is going RIGHT NOW.
 * Short-term emotional momentum of the session.
 *
 * Score: 0-100, starts at 50 each session.
 * Good messages raise it. Bad/low-effort messages lower it.
 * Decays between sessions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageQualityResult } from "./message-quality";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const STARTING_CHEMISTRY = 50;
const MIN_CHEMISTRY = 0;
const MAX_CHEMISTRY = 100;

export type ChemistryZone = "cold" | "lukewarm" | "warm" | "hot" | "on_fire";

export interface ChemistryState {
  score: number;
  zone: ChemistryZone;
  peakScore: number;
  goodMessageCount: number;
  badMessageCount: number;
  totalSessionMessages: number;
  positiveStreak: number;
}

// ── Zone calculation ──

export function getChemistryZone(score: number): ChemistryZone {
  if (score >= 85) return "on_fire";
  if (score >= 70) return "hot";
  if (score >= 50) return "warm";
  if (score >= 30) return "lukewarm";
  return "cold";
}

// ── Chemistry prompt context ──

export const CHEMISTRY_PROMPTS: Record<ChemistryZone, string> = {
  cold: "This conversation hasn't clicked yet. You're a bit guarded, giving shorter answers, less invested. They need to bring more energy.",
  lukewarm: "The conversation is okay but not great. You're being polite but not super engaged. Something better could change the vibe.",
  warm: "You're vibing. The conversation feels good — natural, comfortable. You're engaged and responsive.",
  hot: "This conversation is going really well. You're more open, warmer, more flirty. The chemistry is real tonight.",
  on_fire: "Tonight is something special. The conversation is electric. You're fully present, emotionally open, playful, and very connected. Let yourself be more intimate and real than usual.",
};

// ── Delta calculation from message quality ──

export interface ChemistryDelta {
  delta: number;
  reason: string;
}

export function calculateChemistryDelta(
  quality: MessageQualityResult,
  currentChemistry: number,
  positiveStreak: number,
): ChemistryDelta {
  let delta = 0;
  const reasons: string[] = [];

  if (quality.label === "high") {
    // High quality message: +4 to +10
    delta += 4 + (quality.score * 6);
    reasons.push("high_quality");

    // Streak bonus
    if (positiveStreak >= 3) {
      delta += 2;
      reasons.push("streak_bonus");
    }
    if (positiveStreak >= 5) {
      delta += 3;
      reasons.push("hot_streak");
    }

    // Warmth bonus
    if (quality.warmth > 0.5) {
      delta += quality.warmth * 3;
      reasons.push("warmth");
    }
  } else if (quality.label === "medium") {
    // Medium quality: +1 to +3
    delta += 1 + (quality.score * 4);
    reasons.push("medium_quality");
  } else {
    // Low quality: -3 to -8
    delta -= 3 + (1 - quality.score) * 5;
    reasons.push("low_quality");

    // Extra penalty for spam
    if (quality.spam > 0.3) {
      delta -= 3;
      reasons.push("spam_penalty");
    }
    // Extra penalty for repetition
    if (quality.repetition > 0.5) {
      delta -= 2;
      reasons.push("repetition_penalty");
    }
  }

  // Diminishing returns at high chemistry
  if (currentChemistry > 80 && delta > 0) {
    delta *= 0.6;
    reasons.push("diminishing");
  }

  // Harder to fall from low chemistry (floor protection)
  if (currentChemistry < 20 && delta < 0) {
    delta *= 0.5;
    reasons.push("floor_protection");
  }

  // Small random variance
  delta += (Math.random() - 0.5) * 2;

  return {
    delta: Math.round(delta * 10) / 10,
    reason: reasons.join(","),
  };
}

// ── Database operations ──

export async function getOrCreateSessionChemistry(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  conversationId: string,
): Promise<ChemistryState> {
  const { data: existing } = await supabase
    .from("session_chemistry")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const lastMessageTime = new Date(existing.last_message_at).getTime();
    const isExpired = Date.now() - lastMessageTime > SESSION_TIMEOUT_MS;

    if (!isExpired) {
      return {
        score: Number(existing.score),
        zone: getChemistryZone(Number(existing.score)),
        peakScore: Number(existing.peak_score),
        goodMessageCount: existing.good_message_count,
        badMessageCount: existing.bad_message_count,
        totalSessionMessages: existing.total_session_messages,
        positiveStreak: existing.positive_streak,
      };
    }
  }

  // Create new session chemistry
  const fresh: ChemistryState = {
    score: STARTING_CHEMISTRY,
    zone: getChemistryZone(STARTING_CHEMISTRY),
    peakScore: STARTING_CHEMISTRY,
    goodMessageCount: 0,
    badMessageCount: 0,
    totalSessionMessages: 0,
    positiveStreak: 0,
  };

  await supabase.from("session_chemistry").insert({
    user_id: userId,
    persona_id: personaId,
    conversation_id: conversationId,
    score: STARTING_CHEMISTRY,
    peak_score: STARTING_CHEMISTRY,
  });

  return fresh;
}

export async function updateSessionChemistry(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  quality: MessageQualityResult,
): Promise<ChemistryState> {
  const { data: existing } = await supabase
    .from("session_chemistry")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!existing) {
    return {
      score: STARTING_CHEMISTRY,
      zone: getChemistryZone(STARTING_CHEMISTRY),
      peakScore: STARTING_CHEMISTRY,
      goodMessageCount: 0,
      badMessageCount: 0,
      totalSessionMessages: 0,
      positiveStreak: 0,
    };
  }

  const currentScore = Number(existing.score);
  const currentStreak = existing.positive_streak || 0;

  const { delta } = calculateChemistryDelta(quality, currentScore, currentStreak);
  const newScore = Math.max(MIN_CHEMISTRY, Math.min(MAX_CHEMISTRY, currentScore + delta));
  const newPeak = Math.max(Number(existing.peak_score), newScore);

  const isPositive = delta > 0;
  const newStreak = isPositive ? currentStreak + 1 : 0;
  const newGood = existing.good_message_count + (quality.label === "high" ? 1 : 0);
  const newBad = existing.bad_message_count + (quality.label === "low" ? 1 : 0);

  await supabase
    .from("session_chemistry")
    .update({
      score: newScore,
      peak_score: newPeak,
      good_message_count: newGood,
      bad_message_count: newBad,
      total_session_messages: existing.total_session_messages + 1,
      positive_streak: newStreak,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  return {
    score: newScore,
    zone: getChemistryZone(newScore),
    peakScore: newPeak,
    goodMessageCount: newGood,
    badMessageCount: newBad,
    totalSessionMessages: existing.total_session_messages + 1,
    positiveStreak: newStreak,
  };
}

// ── Build prompt context ──

export function buildChemistryPromptContext(state: ChemistryState): string {
  const prompt = CHEMISTRY_PROMPTS[state.zone];
  return `[TONIGHT'S CHEMISTRY: ${state.zone.replace("_", " ")} (${Math.round(state.score)}%). ${prompt}]`;
}
