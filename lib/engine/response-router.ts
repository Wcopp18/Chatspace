/**
 * Response Router — The core routing engine
 *
 * Decides whether to serve a prewritten response (80-85%) or
 * fall back to Claude (15-20%) based on confidence scoring.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TensionBand } from "@/types/database";
import type { AIMessage } from "@/lib/ai/types";

// Use generic supabase client — tables are validated at runtime, not compile time for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

// Topic detection patterns — maps user input patterns to topic tags
const TOPIC_PATTERNS: Array<{ topic: string; patterns: RegExp[] }> = [
  {
    topic: "good_morning",
    patterns: [
      /\bgood\s*morning\b/i, /\bgm\b/i, /\bmorning\b/i,
      /\bjust\s*woke\s*up\b/i, /\bwaking\s*up\b/i,
    ],
  },
  {
    topic: "goodnight",
    patterns: [
      /\bgood\s*night\b/i, /\bgn\b/i, /\bnighty?\s*night\b/i,
      /\bgoing\s*to\s*(bed|sleep)\b/i, /\bsleepy\b/i, /\btired\b/i,
    ],
  },
  {
    topic: "what_doing",
    patterns: [
      /\bwhat\s*(are\s*you|u|r\s*u)\s*(doing|up\s*to)\b/i,
      /\bwyd\b/i, /\bwhat'?s?\s*up\b/i, /\bwhat\s*u\s*up\s*to\b/i,
      /\bhow'?s?\s*(your|ur)\s*(day|night)\b/i,
    ],
  },
  {
    topic: "compliment",
    patterns: [
      /\b(you'?re?|ur)\s*(so\s*)?(beautiful|pretty|gorgeous|cute|hot|sexy|amazing|perfect|stunning)\b/i,
      /\byou\s*look\s*(so\s*)?(good|great|amazing)\b/i,
    ],
  },
  {
    topic: "flirt",
    patterns: [
      /\b(miss|want|need)\s*(you|u)\b/i,
      /\bwish\s*(you|u)\s*were\s*here\b/i,
      /\bthinking\s*(about|of)\s*(you|u)\b/i,
      /\bcome\s*over\b/i, /\bcuddle\b/i,
    ],
  },
  {
    topic: "tease",
    patterns: [
      /\b(show|send)\s*(me|pics?|photos?|something)\b/i,
      /\bwhat\s*(are\s*you|u)\s*wearing\b/i,
      /\bteasing\b/i, /\byou'?re?\s*(such\s*a\s*)?tease\b/i,
    ],
  },
  {
    topic: "greeting",
    patterns: [
      /^(hey|hi|hello|yo|sup|heyy+|hii+)\b/i,
      /\bhow\s*are\s*(you|u)\b/i,
    ],
  },
  {
    topic: "emoji_only",
    patterns: [
      /^[\p{Emoji}\s]+$/u,
    ],
  },
  {
    topic: "short_reply",
    patterns: [
      /^(lol|lmao|haha|omg|ok|yeah|yea|yep|nah|sure|bet|fr|ong|real|same|true)\s*[.!?]*$/i,
    ],
  },
];

// Mood detection from user message
const MOOD_SIGNALS: Array<{ mood: string; patterns: RegExp[]; weight: number }> = [
  { mood: "flirty", patterns: [/😏|😘|🥵|😈|💋|🔥/], weight: 2 },
  { mood: "warm", patterns: [/💕|❤️|🥰|💗|😊|☺️/], weight: 2 },
  { mood: "playful", patterns: [/😂|🤣|😜|😝|lol|lmao|haha/i], weight: 1 },
  { mood: "vulnerable", patterns: [/🥺|😢|😔|miss|lonely|sad/i], weight: 2 },
  { mood: "excited", patterns: [/!!|omg|😍|🤩|amazing|!{2,}/i], weight: 1 },
];

export interface RoutingDecision {
  route: "prewritten" | "claude";
  confidence: number;
  topicDetected: string | null;
  moodDetected: string | null;
  prewrittenResponse: {
    id: string;
    content: string;
    semanticGroup: string;
  } | null;
}

interface RouterContext {
  userId: string;
  personaId: string;
  conversationId: string;
  userMessage: string;
  messageHistory: AIMessage[];
  tensionScore: number;
  tensionBand: TensionBand;
  messageCount: number;
}

/**
 * Detect the primary topic of a user message
 */
export function detectTopic(message: string): string | null {
  for (const { topic, patterns } of TOPIC_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) return topic;
    }
  }
  return null;
}

/**
 * Detect the mood of a user message
 */
export function detectMood(message: string): string {
  let bestMood = "neutral";
  let bestWeight = 0;

  for (const { mood, patterns, weight } of MOOD_SIGNALS) {
    for (const pattern of patterns) {
      if (pattern.test(message) && weight > bestWeight) {
        bestMood = mood;
        bestWeight = weight;
      }
    }
  }

  return bestMood;
}

/**
 * Calculate routing confidence score.
 * Higher = more confident we can use a prewritten response.
 */
function calculateConfidence(
  topic: string | null,
  mood: string,
  messageLength: number,
  messageCount: number,
  recentMessages: AIMessage[],
): number {
  let confidence = 0;

  // Topic match is the strongest signal
  if (topic) {
    confidence += 0.5;
    // Some topics are more predictable than others
    if (["good_morning", "goodnight", "greeting", "what_doing", "emoji_only", "short_reply"].includes(topic)) {
      confidence += 0.2;
    }
  }

  // Short messages are more predictable
  if (messageLength < 20) confidence += 0.15;
  else if (messageLength < 50) confidence += 0.05;
  else confidence -= 0.2; // Long messages need Claude

  // Early conversations are more predictable
  if (messageCount < 5) confidence += 0.1;

  // Check if user is asking a question (needs Claude)
  if (/\?/.test("")) confidence -= 0.15;

  // Emotional / vulnerable messages need Claude
  if (mood === "vulnerable") confidence -= 0.3;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Main routing function — decides prewritten vs Claude
 */
export async function routeResponse(
  supabase: SupabaseAny,
  ctx: RouterContext,
): Promise<RoutingDecision> {
  const topic = detectTopic(ctx.userMessage);
  const mood = detectMood(ctx.userMessage);
  const confidence = calculateConfidence(
    topic,
    mood,
    ctx.userMessage.length,
    ctx.messageCount,
    ctx.messageHistory,
  );

  // Confidence threshold — above this we try prewritten
  const PREWRITTEN_THRESHOLD = 0.55;

  if (confidence < PREWRITTEN_THRESHOLD || !topic) {
    return {
      route: "claude",
      confidence,
      topicDetected: topic,
      moodDetected: mood,
      prewrittenResponse: null,
    };
  }

  // Try to find a matching prewritten response
  const response = await findPrewrittenResponse(supabase, {
    userId: ctx.userId,
    personaId: ctx.personaId,
    topic,
    mood,
    tensionBand: ctx.tensionBand,
    messageCount: ctx.messageCount,
  });

  if (!response) {
    // No available prewritten response — fall back to Claude
    return {
      route: "claude",
      confidence,
      topicDetected: topic,
      moodDetected: mood,
      prewrittenResponse: null,
    };
  }

  return {
    route: "prewritten",
    confidence,
    topicDetected: topic,
    moodDetected: mood,
    prewrittenResponse: response,
  };
}

/**
 * Find a prewritten response that hasn't been used recently
 * and doesn't belong to a recently-used semantic group
 */
async function findPrewrittenResponse(
  supabase: SupabaseAny,
  params: {
    userId: string;
    personaId: string;
    topic: string;
    mood: string;
    tensionBand: TensionBand;
    messageCount: number;
  },
): Promise<{ id: string; content: string; semanticGroup: string } | null> {
  // Get all matching prewritten responses for this persona + topic
  const { data: candidates } = await supabase
    .from("prewritten_responses")
    .select("id, content, semantic_group, cooldown_seconds, weight")
    .eq("persona_id", params.personaId)
    .eq("topic_tag", params.topic)
    .eq("is_active", true)
    .gte("min_message_count", 0)
    .lte("min_message_count", params.messageCount);

  if (!candidates || candidates.length === 0) return null;

  // Get recent usage for this user + persona
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { data: recentUsage } = await supabase
    .from("response_usage")
    .select("response_id, semantic_group, used_at")
    .eq("user_id", params.userId)
    .eq("persona_id", params.personaId)
    .gte("used_at", oneDayAgo);

  const usedResponseIds = new Set((recentUsage || []).map(u => u.response_id));
  const recentSemanticGroups = new Map<string, Date>();

  for (const usage of recentUsage || []) {
    const usedAt = new Date(usage.used_at);
    const existing = recentSemanticGroups.get(usage.semantic_group);
    if (!existing || usedAt > existing) {
      recentSemanticGroups.set(usage.semantic_group, usedAt);
    }
  }

  // Filter out recently used responses and semantic groups
  const now = Date.now();
  const available = candidates.filter(c => {
    // Skip exact responses used recently
    if (usedResponseIds.has(c.id)) return false;

    // Skip semantic groups used within their cooldown window
    const lastGroupUse = recentSemanticGroups.get(c.semantic_group);
    if (lastGroupUse) {
      const elapsedSeconds = (now - lastGroupUse.getTime()) / 1000;
      if (elapsedSeconds < c.cooldown_seconds) return false;
    }

    return true;
  });

  if (available.length === 0) return null;

  // Weighted random selection
  const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const candidate of available) {
    random -= candidate.weight;
    if (random <= 0) {
      return {
        id: candidate.id,
        content: candidate.content,
        semanticGroup: candidate.semantic_group,
      };
    }
  }

  // Fallback — shouldn't reach here
  const fallback = available[0];
  return {
    id: fallback.id,
    content: fallback.content,
    semanticGroup: fallback.semantic_group,
  };
}

/**
 * Record that a prewritten response was used (for anti-repeat)
 */
export async function recordResponseUsage(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  responseId: string,
  semanticGroup: string,
): Promise<void> {
  await supabase.from("response_usage").insert({
    user_id: userId,
    persona_id: personaId,
    response_id: responseId,
    semantic_group: semanticGroup,
  });
}

/**
 * Log the routing decision for analytics
 */
export async function logRoutingDecision(
  supabase: SupabaseAny,
  conversationId: string,
  userMessage: string,
  decision: RoutingDecision,
  tensionScore: number,
  responseText: string,
): Promise<void> {
  await supabase.from("routing_decisions").insert({
    conversation_id: conversationId,
    user_message: userMessage,
    confidence_score: decision.confidence,
    route_chosen: decision.route,
    prewritten_response_id: decision.prewrittenResponse?.id || null,
    topic_detected: decision.topicDetected,
    mood_detected: decision.moodDetected,
    tension_at_time: tensionScore,
    response_text: responseText,
  });
}
