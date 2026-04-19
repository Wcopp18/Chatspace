/**
 * Session Chemistry Engine — short-term conversation momentum.
 *
 * The underlying score lives in `tension_state.score` (0-100, per session,
 * resets after 30 minutes of inactivity). The tension engine already does
 * the math of rising/falling based on message quality; this module reframes
 * that score as "chemistry" (how tonight is going) and turns it into:
 *
 *   1. a band label (flat / warm / good / hot / electric)
 *   2. a short prompt hint the girl's response should respect
 *   3. a surprise-multiplier for use by the gesture / reward systems
 *
 * Chemistry is hidden from the user — it's only visible through how she
 * talks to them tonight.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateTensionState, isSessionExpired } from "./tension-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export type ChemistryBand = "flat" | "warm" | "good" | "hot" | "electric";

export interface ChemistrySnapshot {
  score: number;
  band: ChemistryBand;
  sessionExpired: boolean;
  sessionMessageCount: number;
  surpriseMultiplier: number;   // 0-1.5; multiplies gesture probabilities
}

export function getChemistryBand(score: number): ChemistryBand {
  if (score >= 85) return "electric";
  if (score >= 65) return "hot";
  if (score >= 45) return "good";
  if (score >= 25) return "warm";
  return "flat";
}

export function getSurpriseMultiplier(band: ChemistryBand): number {
  switch (band) {
    case "electric": return 1.5;
    case "hot":      return 1.2;
    case "good":     return 1.0;
    case "warm":     return 0.75;
    case "flat":     return 0.4;
  }
}

// ── Prompt hint for Claude (invisible to user) ──

const CHEMISTRY_PROMPT: Record<ChemistryBand, string> = {
  electric: "Tonight's conversation is on fire — you're both locked in. Lean closer. More suggestive, more affectionate, more invested. Don't back off.",
  hot:      "The conversation is really going well tonight. You're engaged, teasing, warm. Keep the energy up.",
  good:     "It's a decent vibe tonight — friendly and flirty, nothing extraordinary yet. Let it build.",
  warm:     "Tonight feels a little slower. Be present but not overly eager. Meet his energy, don't force it.",
  flat:     "Tonight feels off — his messages are dry or mood-breaking. Pull back a little. Less warmth, shorter replies. You're not giving freely right now.",
};

export function getChemistryPromptContext(band: ChemistryBand): string {
  return `[TONIGHT'S CHEMISTRY — INVISIBLE TO USER] ${CHEMISTRY_PROMPT[band]}`;
}

// ── DB snapshot (reads from tension_state, which is already being maintained) ──

export async function getChemistrySnapshot(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  conversationId: string,
): Promise<ChemistrySnapshot> {
  const state = await getOrCreateTensionState(supabase, userId, personaId, conversationId);
  const expired = isSessionExpired(state.updated_at);
  const score = expired ? 18 : Number(state.score || 18); // reset value matches tension engine's SESSION_START_TENSION
  const band = getChemistryBand(score);
  return {
    score,
    band,
    sessionExpired: expired,
    sessionMessageCount: state.session_message_count || 0,
    surpriseMultiplier: getSurpriseMultiplier(band),
  };
}
