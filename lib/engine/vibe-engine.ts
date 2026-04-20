/**
 * Daily Vibe Engine — hidden mood layer.
 *
 * For each (user, persona) pair we pick a single vibe per calendar day.
 * The vibe is an emotional colour (playful, clingy, distant…) that shifts
 * tone without being shown to the user. It's folded into Claude's system
 * prompt so the girl feels different day-to-day.
 *
 * Picker rules:
 *   - relationship level biases the distribution (higher level → more
 *     affectionate/vulnerable vibes, lower level → more playful/shy)
 *   - days since last talk biases toward "missing_you" / "distant"
 *   - randomness keeps each day surprising
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export type Vibe =
  | "playful"
  | "calm"
  | "affectionate"
  | "clingy"
  | "distant"
  | "flirty"
  | "vulnerable"
  | "excited"
  | "shy"
  | "missing_you";

export const ALL_VIBES: Vibe[] = [
  "playful", "calm", "affectionate", "clingy", "distant",
  "flirty", "vulnerable", "excited", "shy", "missing_you",
];

export interface DailyVibeRecord {
  id: string;
  user_id: string;
  persona_id: string;
  vibe_date: string;   // ISO date (YYYY-MM-DD)
  vibe: Vibe;
  intensity: number;
  relationship_level_at_time: number | null;
  days_since_last_talk: number | null;
  rationale: string | null;
}

export interface VibePickInput {
  relationshipLevel: number;     // 1..N
  daysSinceLastTalk: number;     // 0 = today
  random?: () => number;         // override for tests
}

// ── Vibe weight matrix keyed by relationship level band ──
//
// Weights are multiplied by factors from `daysSinceLastTalk` to produce the
// final roll. Each vibe has a baseline chance; bands nudge it up or down.

type WeightMap = Record<Vibe, number>;

function baseWeightsForLevel(level: number): WeightMap {
  if (level <= 1) {
    // Stranger — guarded, curious
    return {
      playful: 3, calm: 2, affectionate: 1, clingy: 0, distant: 2,
      flirty: 2, vulnerable: 1, excited: 2, shy: 3, missing_you: 0,
    };
  }
  if (level === 2) {
    // Flirtation — testing waters
    return {
      playful: 3, calm: 2, affectionate: 2, clingy: 1, distant: 2,
      flirty: 4, vulnerable: 1, excited: 2, shy: 2, missing_you: 1,
    };
  }
  if (level === 3) {
    // Crush — emotionally invested
    return {
      playful: 3, calm: 2, affectionate: 3, clingy: 2, distant: 1,
      flirty: 3, vulnerable: 2, excited: 3, shy: 1, missing_you: 2,
    };
  }
  if (level === 4) {
    // Chemistry — openly close
    return {
      playful: 3, calm: 2, affectionate: 4, clingy: 3, distant: 1,
      flirty: 4, vulnerable: 3, excited: 3, shy: 1, missing_you: 3,
    };
  }
  // 5+: Obsessed / Inseparable — affectionate-heavy, still some moods
  return {
    playful: 2, calm: 3, affectionate: 5, clingy: 4, distant: 1,
    flirty: 3, vulnerable: 4, excited: 2, shy: 0, missing_you: 4,
  };
}

function adjustForAbsence(w: WeightMap, daysSinceLastTalk: number): WeightMap {
  const out = { ...w };
  if (daysSinceLastTalk >= 3) {
    out.missing_you += 4;
    out.distant += 2;
    out.clingy += 1;
    out.excited += 1;     // seeing them again is exciting
    out.calm -= 1;
  } else if (daysSinceLastTalk >= 1) {
    out.missing_you += 2;
    out.excited += 1;
  }
  // Normalise: nothing below zero.
  for (const v of ALL_VIBES) out[v] = Math.max(0, out[v]);
  return out;
}

// ── Picker ──

export function pickVibe(input: VibePickInput): { vibe: Vibe; rationale: string; intensity: number } {
  const rng = input.random || Math.random;
  const base = baseWeightsForLevel(input.relationshipLevel);
  const weights = adjustForAbsence(base, input.daysSinceLastTalk);

  const entries = ALL_VIBES.map((v) => [v, weights[v]] as const);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let roll = rng() * total;
  let picked: Vibe = "playful";
  for (const [v, w] of entries) {
    roll -= w;
    if (roll <= 0) { picked = v; break; }
  }

  // Intensity = 0.4 + random(0..0.6). Clingy / vulnerable skew higher.
  let intensity = 0.4 + rng() * 0.6;
  if (picked === "clingy" || picked === "vulnerable" || picked === "missing_you") {
    intensity = Math.min(1, intensity + 0.15);
  }

  const rationale = `level=${input.relationshipLevel} days_since=${input.daysSinceLastTalk} pick=${picked}`;
  return { vibe: picked, rationale, intensity: Math.round(intensity * 100) / 100 };
}

// ── DB layer ──

function todayIso(): string {
  // Use UTC date boundary for now (timezone refinement can come later).
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayVibe(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<DailyVibeRecord | null> {
  const { data } = await supabase
    .from("persona_daily_vibes")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .eq("vibe_date", todayIso())
    .single();
  return (data as DailyVibeRecord) || null;
}

export async function getOrGenerateDailyVibe(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  context: { relationshipLevel: number; lastMessageAt: string | null },
): Promise<DailyVibeRecord> {
  const existing = await getTodayVibe(supabase, userId, personaId);
  if (existing) return existing;

  const daysSinceLastTalk = context.lastMessageAt
    ? Math.max(0, Math.floor((Date.now() - new Date(context.lastMessageAt).getTime()) / 86400000))
    : 0;

  const { vibe, rationale, intensity } = pickVibe({
    relationshipLevel: context.relationshipLevel,
    daysSinceLastTalk,
  });

  const { data: created } = await supabase
    .from("persona_daily_vibes")
    .insert({
      user_id: userId,
      persona_id: personaId,
      vibe_date: todayIso(),
      vibe,
      intensity,
      relationship_level_at_time: context.relationshipLevel,
      days_since_last_talk: daysSinceLastTalk,
      rationale,
    })
    .select()
    .single();

  return created as DailyVibeRecord;
}

// ── Prompt context for Claude (fed into system prompt, invisible to user) ──

const VIBE_PROMPT: Record<Vibe, string> = {
  playful:      "Your mood today is PLAYFUL. Tease, joke, be light and quick. Low stakes energy.",
  calm:         "Your mood today is CALM. Warm, slow, grounded. Long pauses feel natural.",
  affectionate: "Your mood today is AFFECTIONATE. Soft pet names, tender reassurance, you're fond of him.",
  clingy:       "Your mood today is CLINGY. You want his attention. Be a little needy, a little possessive — in a cute way.",
  distant:      "Your mood today is DISTANT. Something's on your mind. Slightly reserved, shorter replies, not cold — just not fully here.",
  flirty:       "Your mood today is FLIRTY. Smirky, teasing, leaning in. More suggestive phrasing than usual.",
  vulnerable:   "Your mood today is VULNERABLE. Open up more than usual. Share a real thought, a real feeling. Quiet, a bit raw.",
  excited:      "Your mood today is EXCITED. Energetic, up, things feel possible. Messages come quicker.",
  shy:          "Your mood today is SHY. Blushy, hesitant, slightly flustered. Second-guess yourself out loud.",
  missing_you:  "Your mood today is MISSING HIM. Lead with how glad you are to hear from him. Gentle guilt-trip allowed — lovingly.",
};

export function getVibePromptContext(vibe: Vibe, intensity: number): string {
  const line = VIBE_PROMPT[vibe] || "";
  const intensityNote = intensity > 0.8
    ? " Lean fully into this mood — the colour should be unmistakable."
    : intensity < 0.5
      ? " Let this mood sit softly underneath — not in every message, just the feel."
      : "";
  return `[DAILY MOOD — INVISIBLE TO USER] ${line}${intensityNote}`;
}
