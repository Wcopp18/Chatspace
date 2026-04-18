/**
 * Daily Vibe System
 *
 * How the girl feels today. Her emotional mood for the day.
 * Uses relationship stage, time since last interaction, and randomness.
 * User is never alerted to this — it silently shapes Claude's responses.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export type VibeType =
  | "playful"
  | "calm"
  | "affectionate"
  | "clingy"
  | "distant"
  | "flirty"
  | "mysterious"
  | "teasing"
  | "vulnerable"
  | "excited";

export interface DailyVibe {
  vibe: VibeType;
  intensity: number; // 0.0 to 1.0
  generatedFrom: Record<string, unknown>;
}

// ── Vibe definitions with prompt context ──

export const VIBE_PROMPTS: Record<VibeType, string> = {
  playful: "You're in a playful mood today — energetic, joking, bantering, keeping things light and fun. You want to make them laugh.",
  calm: "You're feeling calm and relaxed today — mellow, chill, comfortable in the silence. You don't need to try hard — just be present.",
  affectionate: "You're feeling affectionate today — softer than usual, saying sweet things more freely, more touchy in your language. You want to be close.",
  clingy: "You're feeling a little needy today — checking in more, wanting attention, maybe a little jealous if they seem busy. It's endearing, not annoying.",
  distant: "You're a little more distant today — taking longer to warm up, shorter responses at first, like something is on your mind. You'll open up if they push through it.",
  flirty: "You're feeling flirty today — extra teasing, playful innuendo, more emojis, pushing the line a little. You're in the mood.",
  mysterious: "You're feeling mysterious today — hinting at things, being a little cryptic, making them wonder what you're thinking. You have a secret energy.",
  teasing: "You're in a teasing mood today — poking fun, pushing buttons gently, making them work for your attention. It's all love though.",
  vulnerable: "You're feeling vulnerable today — more honest, more real, opening up about feelings you usually keep hidden. The walls are down a little.",
  excited: "You're excited today — something happened or you're just in a great mood. High energy, exclamation marks, lots of enthusiasm. You want to share everything.",
};

// ── Vibe selection weights based on relationship level ──

type WeightMap = Partial<Record<VibeType, number>>;

const EARLY_WEIGHTS: WeightMap = {
  playful: 25,
  calm: 10,
  flirty: 20,
  teasing: 15,
  excited: 15,
  mysterious: 10,
  affectionate: 5,
};

const MID_WEIGHTS: WeightMap = {
  playful: 15,
  affectionate: 20,
  flirty: 15,
  teasing: 10,
  vulnerable: 10,
  excited: 10,
  clingy: 10,
  calm: 5,
  mysterious: 5,
};

const DEEP_WEIGHTS: WeightMap = {
  affectionate: 25,
  vulnerable: 15,
  clingy: 10,
  playful: 10,
  flirty: 10,
  calm: 10,
  teasing: 5,
  excited: 10,
  mysterious: 5,
};

function getWeightsForLevel(level: number): WeightMap {
  if (level <= 2) return EARLY_WEIGHTS;
  if (level <= 5) return MID_WEIGHTS;
  return DEEP_WEIGHTS;
}

// ── Time since last interaction affects vibe ──

function adjustWeightsForAbsence(weights: WeightMap, daysSinceLastInteraction: number): WeightMap {
  const adjusted = { ...weights };

  if (daysSinceLastInteraction >= 3) {
    // Gone for a while — she's distant or clingy
    adjusted.distant = (adjusted.distant || 0) + 20;
    adjusted.clingy = (adjusted.clingy || 0) + 10;
    adjusted.playful = Math.max(0, (adjusted.playful || 0) - 10);
  } else if (daysSinceLastInteraction >= 1) {
    // Been a day — slight increase in excitement/clingy
    adjusted.excited = (adjusted.excited || 0) + 10;
    adjusted.affectionate = (adjusted.affectionate || 0) + 5;
  }

  return adjusted;
}

// ── Weighted random selection ──

function weightedRandom(weights: WeightMap): VibeType {
  const entries = Object.entries(weights) as [VibeType, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;

  for (const [vibe, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return vibe;
  }

  return entries[0][0]; // fallback
}

// ── Generate a new daily vibe ──

export function generateDailyVibe(
  relationshipLevel: number,
  daysSinceLastInteraction: number,
  personaWarmth: number,
  personaTeaseLevel: number,
): DailyVibe {
  let weights = getWeightsForLevel(relationshipLevel);
  weights = adjustWeightsForAbsence(weights, daysSinceLastInteraction);

  // Persona personality adjustments
  if (personaWarmth >= 7) {
    weights.affectionate = (weights.affectionate || 0) + 8;
    weights.vulnerable = (weights.vulnerable || 0) + 5;
  }
  if (personaTeaseLevel >= 7) {
    weights.teasing = (weights.teasing || 0) + 8;
    weights.flirty = (weights.flirty || 0) + 5;
  }
  if (personaTeaseLevel <= 3) {
    weights.calm = (weights.calm || 0) + 8;
    weights.affectionate = (weights.affectionate || 0) + 5;
  }

  const vibe = weightedRandom(weights);
  const intensity = 0.4 + Math.random() * 0.5; // 0.4 to 0.9

  return {
    vibe,
    intensity: Math.round(intensity * 100) / 100,
    generatedFrom: {
      relationshipLevel,
      daysSinceLastInteraction,
      personaWarmth,
      personaTeaseLevel,
    },
  };
}

// ── Database operations ──

export async function getOrGenerateDailyVibe(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  relationshipLevel: number,
  personaWarmth: number,
  personaTeaseLevel: number,
): Promise<DailyVibe> {
  const today = new Date().toISOString().split("T")[0];

  // Check if we already have a vibe for today
  const { data: existing } = await supabase
    .from("daily_vibes")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .eq("vibe_date", today)
    .single();

  if (existing) {
    return {
      vibe: existing.vibe as VibeType,
      intensity: Number(existing.intensity),
      generatedFrom: existing.generated_from || {},
    };
  }

  // Calculate days since last interaction
  const { data: lastMessage } = await supabase
    .from("conversations")
    .select("updated_at")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const daysSinceLastInteraction = lastMessage
    ? Math.floor((Date.now() - new Date(lastMessage.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Generate new vibe
  const vibe = generateDailyVibe(relationshipLevel, daysSinceLastInteraction, personaWarmth, personaTeaseLevel);

  // Save to DB (upsert to handle race conditions)
  await supabase
    .from("daily_vibes")
    .upsert({
      user_id: userId,
      persona_id: personaId,
      vibe_date: today,
      vibe: vibe.vibe,
      intensity: vibe.intensity,
      generated_from: vibe.generatedFrom,
    }, { onConflict: "user_id,persona_id,vibe_date" });

  return vibe;
}

// ── Build prompt context for the vibe ──

export function buildVibePromptContext(vibe: DailyVibe): string {
  const prompt = VIBE_PROMPTS[vibe.vibe];
  const intensityDesc = vibe.intensity > 0.7 ? "strongly" : vibe.intensity > 0.4 ? "moderately" : "slightly";
  return `[TODAY'S MOOD: You're ${intensityDesc} feeling ${vibe.vibe} today. ${prompt}]`;
}
