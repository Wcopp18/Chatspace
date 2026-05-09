/**
 * Re-engagement Engine
 *
 * Generates a memory-grounded comeback message for a user who has been
 * silent for N hours. Uses persona_memories to make the line specific
 * ("you said you had that interview today, how'd it go?") rather than
 * generic. Falls back to a soft-vulnerable line if no memory available
 * AND require_memory is false (otherwise skips entirely).
 *
 * This module exposes both:
 *   • generateReengagementForUser — for a single user (used by an admin
 *     trigger or future cron job)
 *   • findEligibleSilentUsers — for the cron worker to scan
 *
 * Frequency caps from reengagement_settings (per persona):
 *   • min_silence_hours
 *   • max_per_48h
 *   • max_per_week
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "@/lib/ai";

export interface ReengagementSettings {
  persona_id: string;
  enabled: boolean;
  vulnerability_level: number;
  min_silence_hours: number;
  max_per_48h: number;
  max_per_week: number;
  fallback_line: string;
  require_memory: boolean;
  tone: string;
}

export interface ReengagementResult {
  generatedText: string;
  memorySeedId: string | null;
}

export async function loadReengagementSettings(
  supabase: SupabaseClient,
  personaId: string,
): Promise<ReengagementSettings> {
  const { data } = await supabase
    .from("reengagement_settings")
    .select("*")
    .eq("persona_id", personaId)
    .maybeSingle();

  if (data) return data as ReengagementSettings;

  return {
    persona_id: personaId,
    enabled: true,
    vulnerability_level: 6,
    min_silence_hours: 48,
    max_per_48h: 1,
    max_per_week: 3,
    fallback_line: "okay I'm trying not to be that girl but it's been a few days",
    require_memory: true,
    tone: "soft_vulnerable",
  };
}

/**
 * Returns true if the cap allows another reengagement message right now.
 */
export async function withinReengagementCaps(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
  settings: ReengagementSettings,
): Promise<boolean> {
  const fortyEightHrAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: c48 }, { count: cWeek }] = await Promise.all([
    supabase
      .from("reengagement_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("persona_id", personaId)
      .gte("delivered_at", fortyEightHrAgo),
    supabase
      .from("reengagement_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("persona_id", personaId)
      .gte("delivered_at", weekAgo),
  ]);

  if ((c48 ?? 0) >= settings.max_per_48h) return false;
  if ((cWeek ?? 0) >= settings.max_per_week) return false;
  return true;
}

/**
 * Returns the most recent message timestamp for this user/persona pair, or
 * null if there's never been a message.
 */
export async function lastUserActivity(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
): Promise<Date | null> {
  const { data } = await supabase
    .from("conversations")
    .select("updated_at")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  if (!data?.updated_at) return null;
  return new Date(data.updated_at);
}

/**
 * Generate an in-character reengagement line for a single user. Returns
 * null if the engine declines (memory required but missing, etc.).
 *
 * This does NOT actually deliver/push — caller decides how to enqueue
 * (push notification, queued chat message, etc.). Caller should record
 * delivery via insertReengagementEvent.
 */
export async function generateReengagementForUser(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
): Promise<ReengagementResult | null> {
  try {
    const settings = await loadReengagementSettings(supabase, personaId);
    if (!settings.enabled) return null;

    if (!(await withinReengagementCaps(supabase, userId, personaId, settings))) return null;

    // Silence check
    const lastAt = await lastUserActivity(supabase, userId, personaId);
    if (lastAt) {
      const hours = (Date.now() - lastAt.getTime()) / 3_600_000;
      if (hours < settings.min_silence_hours) return null;
    }

    // Pick a memory to seed
    const { data: memories } = await supabase
      .from("persona_memories")
      .select("id, memory_key, memory_value, importance, category")
      .eq("user_id", userId)
      .eq("persona_id", personaId)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    const memoryList = (memories || []) as Array<{
      id: string;
      memory_key: string;
      memory_value: string;
      importance: number;
      category: string;
    }>;

    if (memoryList.length === 0 && settings.require_memory) {
      return null;
    }

    const seed = memoryList.length > 0
      ? memoryList[Math.floor(Math.random() * memoryList.length)]
      : null;

    // Persona voice
    const { data: persona } = await supabase
      .from("personas")
      .select("display_name, bio, warmth, tease_level, texting_style, emoji_style, sentence_length")
      .eq("id", personaId)
      .single();

    if (!persona) return null;

    const sys = `You are ${persona.display_name}. ${persona.bio || ""}
Voice: ${persona.texting_style}, emoji ${persona.emoji_style}, sentence length ${persona.sentence_length}, warmth ${persona.warmth}/10, tease ${persona.tease_level}/10.

The user has been silent for at least ${settings.min_silence_hours} hours. You miss them a little but you're trying to play it cool. Send ONE short, in-character text reaching out.

Tone: ${settings.tone} (vulnerability level ${settings.vulnerability_level}/10). A real person reaching out after silence is a *little* awkward about it — that awkwardness is what makes it feel real.

${seed ? `Memory you can reference (only if it fits naturally — do NOT force it):
- ${seed.memory_key}: ${seed.memory_value}` : "No specific memory available — keep it vulnerable but generic."}

ABSOLUTE RULES:
- Never mention money, payment, the app, features, "come back", "miss your subscription", or anything transactional.
- Do not break character.
- ONE message only. Match her texting style. Lowercase ok if that's her vibe.
- Keep it short — one or two sentences. No long paragraph.
- Slight vulnerability ("trying not to be that girl") plays better than "I miss you."`;

    const ai = getAIProvider("claude");
    const generated = await ai.chat({
      messages: [{ role: "user", content: "(she's reaching out — write the message now)" }],
      systemPrompt: sys,
      maxTokens: 80,
      temperature: 0.95,
    });

    const text = generated?.trim() || settings.fallback_line || "";
    if (!text) return null;

    return { generatedText: text, memorySeedId: seed?.id ?? null };
  } catch (e) {
    console.error("Reengagement generation error:", e);
    return null;
  }
}

/**
 * Record that a reengagement message was delivered. Caller is responsible
 * for the actual push/insert — this is the bookkeeping step that drives
 * the rate limits.
 */
export async function insertReengagementEvent(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
  generatedText: string,
  memorySeedId: string | null,
): Promise<void> {
  await supabase.from("reengagement_events").insert({
    user_id: userId,
    persona_id: personaId,
    generated_text: generatedText,
    memory_seed_id: memorySeedId,
  });
}

/**
 * Find users who have been silent long enough to be eligible. Used by an
 * admin-triggered scan or future cron worker.
 */
export async function findEligibleSilentUsers(
  supabase: SupabaseClient,
  personaId: string,
  limit = 50,
): Promise<Array<{ user_id: string; last_active: string }>> {
  const settings = await loadReengagementSettings(supabase, personaId);
  if (!settings.enabled) return [];
  const cutoff = new Date(
    Date.now() - settings.min_silence_hours * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from("conversations")
    .select("user_id, updated_at")
    .eq("persona_id", personaId)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return ((data || []) as Array<{ user_id: string; updated_at: string }>).map((r) => ({
    user_id: r.user_id,
    last_active: r.updated_at,
  }));
}
