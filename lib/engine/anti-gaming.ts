/**
 * Anti-Gaming System
 *
 * Stops users from cracking the pattern or farming rewards
 * with spam, repetition, or fake effort.
 *
 * - Repetition penalties
 * - Diminishing returns for same kind of message
 * - Cooldowns after rewards
 * - Burst-message suppression
 * - Topic diversity checks
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMessageHash, extractTopics } from "./message-quality";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export interface AntiGamingState {
  recentMessageHashes: string[];
  recentTopics: string[];
  burstCount: number;
  repeatCount: number;
  sameTopicCount: number;
  diminishingFactor: number;
  repetitionPenalty: number;   // 0-1
  burstPenalty: number;        // 0-1
  topicDiversity: number;      // 0-1
}

export interface AntiGamingResult {
  state: AntiGamingState;
  xpMultiplier: number;        // 0-1, applied to XP gains
  chemistryMultiplier: number;  // 0-1, applied to chemistry gains
  warnings: string[];          // internal debugging
}

// ── Constants ──

const MAX_RECENT_HASHES = 20;
const MAX_RECENT_TOPICS = 15;
const BURST_WINDOW_SECONDS = 30;
const BURST_THRESHOLD = 4; // 4+ messages in 30 seconds = burst
const REPEAT_THRESHOLD = 3; // 3+ similar messages = heavy penalty
const SAME_TOPIC_THRESHOLD = 5; // 5+ same topic = diversity penalty

// ── Get or create anti-gaming state ──

export async function getOrCreateAntiGaming(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<AntiGamingState> {
  const { data: existing } = await supabase
    .from("anti_gaming_state")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (existing) {
    return {
      recentMessageHashes: existing.recent_message_hashes || [],
      recentTopics: existing.recent_topics || [],
      burstCount: existing.burst_count || 0,
      repeatCount: existing.repeat_count || 0,
      sameTopicCount: existing.same_topic_count || 0,
      diminishingFactor: Number(existing.diminishing_factor) || 1.0,
      repetitionPenalty: 0, // calculated fresh each time
      burstPenalty: 0,
      topicDiversity: 0.5,
    };
  }

  const fresh: AntiGamingState = {
    recentMessageHashes: [],
    recentTopics: [],
    burstCount: 0,
    repeatCount: 0,
    sameTopicCount: 0,
    diminishingFactor: 1.0,
    repetitionPenalty: 0,
    burstPenalty: 0,
    topicDiversity: 0.5,
  };

  await supabase.from("anti_gaming_state").insert({
    user_id: userId,
    persona_id: personaId,
  });

  return fresh;
}

// ── Evaluate a message and update anti-gaming state ──

export async function evaluateAntiGaming(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  message: string,
): Promise<AntiGamingResult> {
  const state = await getOrCreateAntiGaming(supabase, userId, personaId);
  const warnings: string[] = [];

  const messageHash = getMessageHash(message);
  const topics = extractTopics(message);

  // ── Repetition detection ──

  let repeatCount = 0;
  const normalizedHash = messageHash;

  // Check exact repeats
  if (state.recentMessageHashes.includes(normalizedHash)) {
    repeatCount = state.repeatCount + 1;
    warnings.push("exact_repeat");
  } else {
    // Check similarity (word overlap)
    const currentWords = new Set(normalizedHash.split(' '));
    for (const pastHash of state.recentMessageHashes.slice(-5)) {
      const pastWords = new Set(pastHash.split(' '));
      const intersection = [...currentWords].filter(w => pastWords.has(w)).length;
      const union = new Set([...currentWords, ...pastWords]).size;
      if (union > 0 && intersection / union > 0.7) {
        repeatCount = state.repeatCount + 1;
        warnings.push("similar_repeat");
        break;
      }
    }
  }

  const repetitionPenalty = repeatCount >= REPEAT_THRESHOLD ? 0.8 :
                           repeatCount >= 2 ? 0.4 :
                           repeatCount >= 1 ? 0.15 : 0;

  // ── Burst detection ──

  let burstCount = 0;
  const { data: agState } = await supabase
    .from("anti_gaming_state")
    .select("burst_window_start, burst_count, last_message_at")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (agState?.last_message_at) {
    const secondsSinceLast = (Date.now() - new Date(agState.last_message_at).getTime()) / 1000;
    if (secondsSinceLast < BURST_WINDOW_SECONDS) {
      burstCount = (agState.burst_count || 0) + 1;
      if (burstCount >= BURST_THRESHOLD) {
        warnings.push("burst_detected");
      }
    } else {
      burstCount = 1; // reset
    }
  } else {
    burstCount = 1;
  }

  const burstPenalty = burstCount >= BURST_THRESHOLD + 2 ? 0.8 :
                      burstCount >= BURST_THRESHOLD ? 0.5 :
                      burstCount >= 3 ? 0.2 : 0;

  // ── Topic diversity ──

  const allTopics = [...state.recentTopics, ...topics].slice(-MAX_RECENT_TOPICS);
  const uniqueTopics = new Set(allTopics);
  const topicDiversity = allTopics.length > 0 ? uniqueTopics.size / Math.min(allTopics.length, 8) : 0.5;

  // Same topic count
  let sameTopicCount = 0;
  if (topics.length > 0 && state.recentTopics.length > 0) {
    const lastTopic = state.recentTopics[state.recentTopics.length - 1];
    if (topics.includes(lastTopic)) {
      sameTopicCount = state.sameTopicCount + 1;
    }
  }

  // ── Diminishing returns ──

  let diminishingFactor = state.diminishingFactor;
  if (repeatCount > 0) diminishingFactor = Math.max(0.1, diminishingFactor - 0.15);
  if (burstCount >= BURST_THRESHOLD) diminishingFactor = Math.max(0.1, diminishingFactor - 0.2);
  if (sameTopicCount >= SAME_TOPIC_THRESHOLD) diminishingFactor = Math.max(0.2, diminishingFactor - 0.1);

  // Natural recovery
  if (repeatCount === 0 && burstCount < 3) {
    diminishingFactor = Math.min(1.0, diminishingFactor + 0.05);
  }

  // ── Calculate multipliers ──

  const xpMultiplier = Math.max(0, Math.min(1,
    diminishingFactor * (1 - repetitionPenalty * 0.5) * (1 - burstPenalty * 0.5)
  ));

  const chemistryMultiplier = Math.max(0, Math.min(1,
    diminishingFactor * (1 - repetitionPenalty * 0.3) * (1 - burstPenalty * 0.4)
  ));

  // ── Update state in DB ──

  const newHashes = [...state.recentMessageHashes, normalizedHash].slice(-MAX_RECENT_HASHES);
  const newTopics = allTopics;

  await supabase
    .from("anti_gaming_state")
    .upsert({
      user_id: userId,
      persona_id: personaId,
      recent_message_hashes: newHashes,
      recent_topics: newTopics,
      burst_count: burstCount,
      burst_window_start: burstCount === 1 ? new Date().toISOString() : agState?.burst_window_start,
      repeat_count: repeatCount,
      same_topic_count: sameTopicCount,
      diminishing_factor: diminishingFactor,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,persona_id" });

  const newState: AntiGamingState = {
    recentMessageHashes: newHashes,
    recentTopics: newTopics,
    burstCount,
    repeatCount,
    sameTopicCount,
    diminishingFactor,
    repetitionPenalty,
    burstPenalty,
    topicDiversity,
  };

  return { state: newState, xpMultiplier, chemistryMultiplier, warnings };
}

// ── Reset daily counters ──

export async function resetDailyAntiGaming(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<void> {
  await supabase
    .from("anti_gaming_state")
    .update({
      reward_count_today: 0,
      reward_count_date: new Date().toISOString().split("T")[0],
      diminishing_factor: 1.0,
      burst_count: 0,
      repeat_count: 0,
      same_topic_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("persona_id", personaId);
}
