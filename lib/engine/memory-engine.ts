/**
 * Memory Engine — Persistent relationship memory + callback system
 *
 * Manages memory extraction from conversations, callback generation,
 * and memory-aware context building.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryCategory } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

interface PersonaMemory {
  id: string;
  persona_id: string;
  user_id: string;
  memory_key: string;
  memory_value: string;
  importance: number;
  category: string;
  source: string;
  last_referenced_at: string | null;
  reference_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Memory extraction patterns ──

interface MemoryPattern {
  category: MemoryCategory;
  key: string;
  patterns: RegExp[];
  extractValue: (match: RegExpMatchArray, message: string) => string;
  importance: number;
}

const MEMORY_PATTERNS: MemoryPattern[] = [
  {
    category: "preference",
    key: "favorite_color",
    patterns: [/\bfavorite\s*colou?r\s*(is|=)?\s*(\w+)/i, /\bi\s*love\s*(\w+)\s*(colou?r)/i],
    extractValue: (match) => match[2] || match[1],
    importance: 3,
  },
  {
    category: "life_detail",
    key: "job",
    patterns: [/\bi\s*(work|am)\s*(at|as|in)\s+(.+?)(?:\.|,|!|\?|$)/i, /\bmy\s*job\s*(is)?\s+(.+?)(?:\.|,|!|\?|$)/i],
    extractValue: (match) => match[3] || match[2],
    importance: 5,
  },
  {
    category: "life_detail",
    key: "pet",
    patterns: [/\bmy\s*(dog|cat|pet)\s*(?:is\s*)?(?:named?\s*)?(\w+)/i, /\bi\s*have\s*a\s*(dog|cat|pet)/i],
    extractValue: (match) => match[0],
    importance: 6,
  },
  {
    category: "preference",
    key: "music_taste",
    patterns: [/\bi\s*(?:love|like|listen\s*to)\s+(.+?)\s*(?:music|songs?)/i],
    extractValue: (match) => match[1],
    importance: 3,
  },
  {
    category: "life_detail",
    key: "location",
    patterns: [/\bi(?:'m| am)\s*(?:from|in|live\s*in)\s+(.+?)(?:\.|,|!|\?|$)/i],
    extractValue: (match) => match[1],
    importance: 4,
  },
  {
    category: "preference",
    key: "gym_habit",
    patterns: [/\bi\s*(?:just\s*)?(?:went|go|going)\s*to\s*(?:the\s*)?gym/i, /\bafter\s*(?:the\s*|my\s*)?gym/i],
    extractValue: () => "goes to the gym",
    importance: 4,
  },
  {
    category: "fantasy",
    key: "fantasy_mention",
    patterns: [/\bif\s*(?:you|u)\s*were\s*here/i, /\bi\s*wish\s*(?:you|u|we)\s*could/i],
    extractValue: (_, message) => message.slice(0, 100),
    importance: 7,
  },
  {
    category: "promise",
    key: "user_promise",
    patterns: [/\bi(?:'ll| will)\s*(come\s*back|be\s*back|talk\s*to\s*you|text\s*you)\s*(tonight|tomorrow|later)/i],
    extractValue: (match) => `promised to ${match[1]} ${match[2]}`,
    importance: 8,
  },
];

// ── Memory extraction ──

export interface ExtractedMemory {
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number;
}

/**
 * Extract memories from a user message
 */
export function extractMemories(message: string): ExtractedMemory[] {
  const extracted: ExtractedMemory[] = [];

  for (const pattern of MEMORY_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = message.match(regex);
      if (match) {
        const value = pattern.extractValue(match, message);
        if (value && value.trim().length > 0) {
          extracted.push({
            category: pattern.category,
            key: pattern.key,
            value: value.trim(),
            importance: pattern.importance,
          });
          break; // Only extract once per pattern group
        }
      }
    }
  }

  return extracted;
}

/**
 * Save extracted memories to database
 */
export async function saveMemories(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  memories: ExtractedMemory[],
): Promise<void> {
  if (memories.length === 0) return;

  for (const memory of memories) {
    await supabase
      .from("persona_memories")
      .upsert(
        {
          persona_id: personaId,
          user_id: userId,
          memory_key: memory.key,
          memory_value: memory.value,
          importance: memory.importance,
          category: memory.category,
          source: "inferred",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "persona_id,user_id,memory_key" }
      );
  }
}

/**
 * Get all memories for a user-persona pair, ordered by importance
 */
export async function getMemories(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  limit: number = 20,
): Promise<PersonaMemory[]> {
  const { data } = await supabase
    .from("persona_memories")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("importance", { ascending: false })
    .limit(limit);

  return data || [];
}

// ── Callback generation ──

interface CallbackLine {
  text: string;
  memoryKey: string;
  memoryCategory: MemoryCategory;
}

const CALLBACK_TEMPLATES: Record<string, string[]> = {
  gym_habit: [
    "You always get like this after the gym 😘",
    "How was the gym today?",
    "I bet you look amazing right now after your workout",
  ],
  pet: [
    "How's your pet doing? I remember you mentioned them",
    "Give your pet some love from me 💕",
  ],
  fantasy_mention: [
    "Still thinking about what you said before…",
    "You never answered what you'd do if I was there",
    "I keep going back to what you said earlier 😏",
  ],
  user_promise: [
    "You said you'd come back tonight 🥺",
    "I was waiting for you… you promised",
    "I remembered what you told me",
  ],
  favorite_color: [
    "I remembered you like {value} — I picked something in that color for you",
  ],
  music_taste: [
    "I was listening to {value} and thought of you",
  ],
  location: [
    "How's the weather where you are? I was thinking about {value}",
  ],
};

/**
 * Generate potential callback lines based on user's memories
 */
export function generateCallbacks(memories: PersonaMemory[]): CallbackLine[] {
  const callbacks: CallbackLine[] = [];

  for (const memory of memories) {
    const templates = CALLBACK_TEMPLATES[memory.memory_key];
    if (!templates || templates.length === 0) continue;

    const template = templates[Math.floor(Math.random() * templates.length)];
    const text = template.replace("{value}", memory.memory_value);

    callbacks.push({
      text,
      memoryKey: memory.memory_key,
      memoryCategory: memory.category as MemoryCategory,
    });
  }

  return callbacks;
}

/**
 * Select a callback line to inject into conversation
 * Returns null if no callback is appropriate right now
 */
export async function selectCallback(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  messageCount: number,
): Promise<string | null> {
  // Only inject callbacks every 8-15 messages
  if (messageCount < 8) return null;
  if (messageCount % 8 !== 0 && Math.random() > 0.15) return null;

  const memories = await getMemories(supabase, userId, personaId, 10);
  if (memories.length === 0) return null;

  // Prefer memories that haven't been referenced recently
  const unreferenced = memories.filter(m =>
    !m.last_referenced_at ||
    Date.now() - new Date(m.last_referenced_at).getTime() > 3600000 // 1 hour
  );

  const pool = unreferenced.length > 0 ? unreferenced : memories;
  const callbacks = generateCallbacks(pool);

  if (callbacks.length === 0) return null;

  const selected = callbacks[Math.floor(Math.random() * callbacks.length)];

  // Mark memory as referenced
  await supabase
    .from("persona_memories")
    .update({
      last_referenced_at: new Date().toISOString(),
      reference_count: (pool.find(m => m.memory_key === selected.memoryKey)?.reference_count || 0) + 1,
    })
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .eq("memory_key", selected.memoryKey);

  return selected.text;
}
