/**
 * Surprise Gesture Engine
 *
 * Picks a spontaneous free gift (note, image, video, bundle) when the
 * user's behaviour, relationship stage, chemistry, and daily vibe line
 * up. The creator defines the library of gestures; this engine filters,
 * scores, and probabilistically selects one per message-exchange.
 *
 * Inputs:
 *   - hiddenProgressBoost   (0..1) from progress-engine
 *   - chemistryMultiplier   (0.4..1.5) from chemistry-engine
 *   - relationship level
 *   - today's vibe (filters eligible gestures)
 *   - quality category of the triggering message (low blocks everything)
 *   - last gesture delivery per-user (per-gesture cooldown)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChemistryBand } from "./chemistry-engine";
import type { Vibe } from "./vibe-engine";
import type { QualityCategory } from "./quality-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export type GestureType = "note" | "free_image" | "free_video" | "bundle" | "daily_drop";

export interface SurpriseGesture {
  id: string;
  persona_id: string;
  gesture_type: GestureType;
  content_text: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  min_relationship_level: number;
  min_chemistry_band: ChemistryBand;
  vibe_tags: string[];
  cooldown_hours: number;
  weight: number;
  is_active: boolean;
}

export interface GestureDecisionInput {
  hiddenProgressBoost: number;
  chemistryBand: ChemistryBand;
  chemistryMultiplier: number;
  relationshipLevel: number;
  vibe: Vibe;
  qualityCategory: QualityCategory;
  random?: () => number;
}

export interface GestureDecision {
  shouldDeliver: boolean;
  probability: number;
  selectedGesture: SurpriseGesture | null;
  reason: string;
}

const BAND_RANK: Record<ChemistryBand, number> = {
  flat: 0, warm: 1, good: 2, hot: 3, electric: 4,
};

export function filterEligibleGestures(
  gestures: SurpriseGesture[],
  input: GestureDecisionInput,
  cooldownMap: Record<string, number>,   // gesture_id → ms-since-last-delivery (or Infinity)
): SurpriseGesture[] {
  return gestures.filter(g => {
    if (!g.is_active) return false;
    if (g.min_relationship_level > input.relationshipLevel) return false;
    if (BAND_RANK[g.min_chemistry_band] > BAND_RANK[input.chemistryBand]) return false;
    if (g.vibe_tags.length > 0 && !g.vibe_tags.includes(input.vibe)) return false;
    const since = cooldownMap[g.id] ?? Infinity;
    if (since < g.cooldown_hours * 3_600_000) return false;
    return true;
  });
}

export function evaluateGesture(
  gestures: SurpriseGesture[],
  input: GestureDecisionInput,
  cooldownMap: Record<string, number>,
): GestureDecision {
  const rng = input.random || Math.random;

  // Quality floor: low-quality messages never trigger a gesture.
  if (input.qualityCategory === "low") {
    return { shouldDeliver: false, probability: 0, selectedGesture: null, reason: "low_quality_message" };
  }

  const eligible = filterEligibleGestures(gestures, input, cooldownMap);
  if (eligible.length === 0) {
    return { shouldDeliver: false, probability: 0, selectedGesture: null, reason: "no_eligible_gestures" };
  }

  // Base probability from hidden progress * chemistry multiplier, capped.
  let probability = input.hiddenProgressBoost * 0.6 * input.chemistryMultiplier;
  if (input.qualityCategory === "high") probability *= 1.15;
  probability = Math.max(0, Math.min(0.85, probability));

  if (rng() > probability) {
    return { shouldDeliver: false, probability, selectedGesture: null, reason: "roll_miss" };
  }

  // Weighted pick among eligible, boosting gestures that explicitly tag today's vibe.
  const weights = eligible.map(g => {
    let w = g.weight;
    if (g.vibe_tags.includes(input.vibe)) w *= 1.5;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  let picked = eligible[0];
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { picked = eligible[i]; break; }
  }

  return { shouldDeliver: true, probability, selectedGesture: picked, reason: "rolled_win" };
}

// ── DB layer ──

export async function loadGesturesForPersona(
  supabase: SupabaseAny,
  personaId: string,
): Promise<SurpriseGesture[]> {
  const { data } = await supabase
    .from("surprise_gestures")
    .select("*")
    .eq("persona_id", personaId)
    .eq("is_active", true);
  return (data as SurpriseGesture[]) || [];
}

export async function loadCooldownMap(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  gestureIds: string[],
): Promise<Record<string, number>> {
  if (gestureIds.length === 0) return {};
  const { data } = await supabase
    .from("user_surprise_gesture_deliveries")
    .select("gesture_id, delivered_at")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .in("gesture_id", gestureIds);
  const now = Date.now();
  const map: Record<string, number> = {};
  for (const row of (data as Array<{ gesture_id: string; delivered_at: string }>) || []) {
    const ts = new Date(row.delivered_at).getTime();
    const age = now - ts;
    if (!map[row.gesture_id] || age < map[row.gesture_id]) {
      map[row.gesture_id] = age;
    }
  }
  return map;
}

export async function recordDelivery(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  gestureId: string,
  context: { chemistryBand: ChemistryBand; vibe: Vibe; boost: number },
): Promise<void> {
  await supabase.from("user_surprise_gesture_deliveries").insert({
    user_id: userId,
    persona_id: personaId,
    gesture_id: gestureId,
    chemistry_at_delivery: context.chemistryBand,
    vibe_at_delivery: context.vibe,
    boost_at_delivery: context.boost,
  });
}
