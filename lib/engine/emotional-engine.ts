/**
 * Emotional Engine
 *
 * Sits on top of the existing tension / chemistry / quality engines and
 * decides which configurable "emotional category" (CONFIDENCE_SPIKE_CRASH,
 * EMBARRASSMENT, OH_WAIT_THERES_MORE, etc.) the AI should express on this
 * turn — if any.
 *
 * The category decides:
 *   • the emotional direction of the line
 *   • style references to paraphrase (NOT exact text — default is paraphrase)
 *   • whether continue-chat / multi-media / subscription prompts are eligible
 *
 * This module is INTENTIONALLY non-destructive. If anything fails, the chat
 * route continues without an emotional category. The girl never says
 * "buy", "purchase", "checkout" — paraphrased lines are surfaced as STYLE
 * GUIDANCE; the UI handles all transparent payment terms.
 */

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EmotionalCategory,
  EmotionalCategoryExample,
  EmotionalCategoryOverride,
  EmotionalDecision,
  EmotionalPersonaSettings,
  EmotionalSignalWeight,
  EmotionalSignals,
  ParaphraseMode,
} from "@/types/emotional-engine";

// ── Default settings, used when no per-girl row exists ────────────────────

export const DEFAULT_EMOTIONAL_SETTINGS: Omit<
  EmotionalPersonaSettings,
  "persona_id" | "created_at" | "updated_at"
> = {
  min_messages_before_media: 6,
  min_messages_before_multi_media: 12,
  continue_chat_cooldown_seconds: 1800,
  subscription_cooldown_seconds: 86400,
  randomness_percent: 25,
  monetization_pacing_speed: "medium",
  emotional_pacing_speed: "medium",

  leaving_style: "soft_exit",
  leaving_reluctance: 6,
  leaving_min_session_messages: 14,
  leaving_min_session_duration_seconds: 600,
  leaving_max_prompts_per_day: 2,

  positive_signals: [
    "compliments",
    "reassurance",
    "flirting",
    "long_conversations",
    "daily_returns",
    "emotional_support",
    "asks_personal_questions",
  ],
  negative_signals: [
    "insults",
    "ignored_vulnerability",
    "repeated_dry_responses",
    "ignoring_moments",
    "rude_comments",
    "dismissing_vulnerability",
    "talking_only_sexually",
  ],
  reaction_style: "shy_hurt",
  recovery_speed: 6,

  memory_strength: 6,
  attachment_speed: 5,
  callback_frequency: 4,
  remembered_categories: [
    "compliments",
    "vulnerability",
    "jokes",
    "insecurities",
    "favorite_topics",
    "late_night",
    "reassurance",
  ],

  phrase_cooldown_seconds: 600,
  similarity_threshold: 0.55,
  max_phrase_reuse: 2,
  awkwardness: 5,
  impulsiveness: 5,
  overthinking: 5,
  hesitation: 4,
  lowercase_percent: 70,
  punctuation_chaos: 4,
  emoji_randomness: 5,
  typo_frequency: 1,
};

// ── Category fetching (with per-girl overrides applied) ───────────────────

interface CategoryWithExamples extends EmotionalCategory {
  examples: string[];
  override?: EmotionalCategoryOverride;
}

export async function loadCategoriesForPersona(
  supabase: SupabaseClient,
  personaId: string,
): Promise<CategoryWithExamples[]> {
  const [{ data: cats }, { data: examples }, { data: overrides }] =
    await Promise.all([
      supabase
        .from("emotional_categories")
        .select("*")
        .eq("enabled", true)
        .order("sort_order"),
      supabase
        .from("emotional_category_examples")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("emotional_category_overrides")
        .select("*")
        .eq("persona_id", personaId),
    ]);

  if (!cats) return [];

  const examplesByCat = new Map<string, EmotionalCategoryExample[]>();
  for (const ex of examples || []) {
    const list = examplesByCat.get(ex.category_id) || [];
    list.push(ex);
    examplesByCat.set(ex.category_id, list);
  }

  const overrideByCat = new Map<string, EmotionalCategoryOverride>();
  for (const o of overrides || []) {
    overrideByCat.set(o.category_id, o);
  }

  const result: CategoryWithExamples[] = [];
  for (const c of cats as EmotionalCategory[]) {
    const ov = overrideByCat.get(c.id);
    if (ov?.enabled_override === false) continue;

    const merged: EmotionalCategory = ov?.override_patch
      ? { ...c, ...ov.override_patch as Partial<EmotionalCategory> }
      : c;

    const baseLines = (examplesByCat.get(c.id) || []).map((e) => e.line);
    const customLines = ov?.custom_examples || [];
    const examples = [...baseLines, ...customLines].filter(Boolean);

    result.push({ ...merged, examples, override: ov });
  }

  return result;
}

// ── Per-girl persona settings (with defaults) ─────────────────────────────

export async function loadPersonaSettings(
  supabase: SupabaseClient,
  personaId: string,
): Promise<EmotionalPersonaSettings> {
  const { data } = await supabase
    .from("emotional_persona_settings")
    .select("*")
    .eq("persona_id", personaId)
    .maybeSingle();

  if (data) return data as EmotionalPersonaSettings;

  return {
    persona_id: personaId,
    ...DEFAULT_EMOTIONAL_SETTINGS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Signal weights (per-girl with global fallback) ────────────────────────

export async function loadSignalWeights(
  supabase: SupabaseClient,
  personaId: string,
): Promise<Map<string, EmotionalSignalWeight>> {
  const { data } = await supabase
    .from("emotional_signal_weights")
    .select("*")
    .or(`persona_id.eq.${personaId},persona_id.is.null`);

  const map = new Map<string, EmotionalSignalWeight>();
  for (const row of (data || []) as EmotionalSignalWeight[]) {
    const existing = map.get(row.signal_key);
    // Per-girl wins over global default
    if (!existing || (row.persona_id && !existing.persona_id)) {
      map.set(row.signal_key, row);
    }
  }
  return map;
}

// ── Trigger evaluation ────────────────────────────────────────────────────

export interface EvaluateInput {
  signals: EmotionalSignals;
  /** ms timestamps of recent same-category fires for cooldown */
  recentCategoryFires: Map<string, number[]>;
  /** which placement context this evaluation is for */
  placement: keyof Pick<
    EmotionalCategory,
    | "place_before_media"
    | "place_after_media"
    | "place_delayed_followup"
    | "place_expiration_event"
    | "place_continue_chat"
    | "place_subscription_prompt"
    | "place_normal_chat"
  >;
  /** which media-type compatibility we need (if injecting media) */
  compatibility?: keyof Pick<
    EmotionalCategory,
    | "compat_image"
    | "compat_video"
    | "compat_multi_media"
    | "compat_continue_chat"
    | "compat_subscription"
    | "compat_expiration"
    | "compat_delayed_followup"
  >;
  /** soft hard-stops from elsewhere (rejection, support intent) */
  hardBlock?: { reason: string } | null;
  /** randomness percentage (skip even when eligible) */
  randomnessPercent?: number;
}

export function evaluateEmotionalCategory(
  categories: CategoryWithExamples[],
  input: EvaluateInput,
): EmotionalDecision {
  if (input.hardBlock) {
    return blocked(input.hardBlock.reason);
  }

  const eligible: { cat: CategoryWithExamples; weight: number; reason: string }[] = [];
  const s = input.signals;
  const now = Date.now();

  for (const cat of categories) {
    if (!cat.enabled) continue;
    if (!cat[input.placement]) continue;
    if (input.compatibility && !cat[input.compatibility]) continue;

    // Hard threshold checks
    if (s.totalMessages < cat.min_total_messages) continue;
    if (s.userMessages < cat.min_user_messages) continue;
    if (s.aiMessages < cat.min_ai_messages) continue;
    if (s.backAndForthCount < cat.min_back_and_forth_count) continue;
    if (s.sessionDurationSeconds < cat.min_session_duration_seconds) continue;
    if (s.conversationQualityScore < cat.min_conversation_quality_score) continue;
    if (s.emotionalMomentumScore < cat.min_emotional_momentum_score) continue;
    if (s.flirtinessScore < cat.min_flirtiness_score) continue;
    if (s.vulnerabilityScore < cat.min_vulnerability_score) continue;
    if (s.trustScore < cat.min_trust_score) continue;
    if (s.engagementScore < cat.min_engagement_score) continue;
    if (s.attachmentScore < cat.min_attachment_score) continue;
    if (s.timeSinceLastMediaSeconds < cat.min_time_since_last_media_seconds) continue;
    if (
      s.timeSinceLastMonetizationSeconds <
      cat.min_time_since_last_monetization_seconds
    )
      continue;

    // Category cooldown
    const fires = input.recentCategoryFires.get(cat.internal_key) || [];
    const lastFireMs = fires.length > 0 ? fires[fires.length - 1] : 0;
    const sinceLastSec = lastFireMs > 0 ? (now - lastFireMs) / 1000 : Infinity;
    if (sinceLastSec < cat.min_time_since_last_same_category_seconds) continue;
    if (sinceLastSec < cat.cooldown_seconds) continue;

    // Caps
    if (fires.length >= cat.max_same_category_uses_per_conversation) continue;
    const todayCount = fires.filter(
      (ts) => now - ts < 24 * 60 * 60 * 1000,
    ).length;
    if (todayCount >= cat.max_same_category_uses_per_day) continue;

    // Negative-signal soft pause for monetization-flavored categories
    if (
      (cat.compat_subscription || cat.compat_continue_chat) &&
      (s.hadDirectRejection || s.hadIgnoredMedia)
    ) {
      const cfg = (cat.behavior_config || {}) as { do_not_repeat_after_rejection?: boolean };
      if (cfg.do_not_repeat_after_rejection) continue;
    }

    eligible.push({
      cat,
      weight: Math.max(1, cat.probability_weight),
      reason: "eligible",
    });
  }

  if (eligible.length === 0) {
    return {
      category: null,
      paraphraseLines: [],
      resolvedMode: "paraphrase",
      reason: "no_eligible_category",
      blocked: false,
      triggerScores: scoresSnapshot(s),
    };
  }

  // Randomness skip — preserves the realism beat already in tension-engine
  const skipPct = input.randomnessPercent ?? 25;
  if (Math.random() * 100 < skipPct) {
    return {
      category: null,
      paraphraseLines: [],
      resolvedMode: "paraphrase",
      reason: "randomness_skip",
      blocked: false,
      triggerScores: scoresSnapshot(s),
    };
  }

  // Weighted pick
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let pick = Math.random() * totalWeight;
  let chosen = eligible[0];
  for (const e of eligible) {
    pick -= e.weight;
    if (pick <= 0) {
      chosen = e;
      break;
    }
  }

  // Pick up to 3 example lines as style guidance (for paraphrase mode)
  const sample = sampleN(chosen.cat.examples, 3);

  return {
    category: chosen.cat,
    paraphraseLines: sample,
    resolvedMode: chosen.cat.paraphrase_mode,
    reason: `picked:${chosen.cat.internal_key}`,
    blocked: false,
    triggerScores: scoresSnapshot(s),
  };
}

function blocked(reason: string): EmotionalDecision {
  return {
    category: null,
    paraphraseLines: [],
    resolvedMode: "paraphrase",
    reason: `blocked:${reason}`,
    blocked: true,
    triggerScores: {},
  };
}

function scoresSnapshot(s: EmotionalSignals): Record<string, number> {
  return {
    momentum: s.emotionalMomentumScore,
    flirt: s.flirtinessScore,
    vuln: s.vulnerabilityScore,
    trust: s.trustScore,
    engagement: s.engagementScore,
    attachment: s.attachmentScore,
    quality: s.conversationQualityScore,
    msgs: s.totalMessages,
  };
}

function sampleN<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ── Behavior brief for the AI prompt ──────────────────────────────────────

/**
 * Render the chosen category as a system-prompt brief that tells Claude how
 * to color this turn. Default mode is paraphrase: the example lines are
 * STYLE references, not lines to echo verbatim.
 */
export function buildEmotionalBrief(
  decision: EmotionalDecision,
  settings: EmotionalPersonaSettings,
): string {
  if (!decision.category) return "";
  const cat = decision.category;
  const mode = decision.resolvedMode;

  const lines: string[] = [];
  lines.push(
    `[EMOTIONAL CATEGORY — INVISIBLE TO USER] ${cat.display_name} (${cat.internal_key}).`,
  );
  lines.push(cat.description);

  if (mode === "exact" && decision.paraphraseLines.length > 0) {
    lines.push(
      `Use this line nearly verbatim, lightly adapted to your voice: "${decision.paraphraseLines[0]}"`,
    );
  } else if (mode === "ai_generate") {
    lines.push(
      `Generate a fresh line in this emotional direction. Do not repeat phrasing you've used recently. Stay in character.`,
    );
  } else {
    // paraphrase (default)
    lines.push(
      `Style references (do NOT copy these — write a fresh line carrying the same emotional meaning, in your voice):`,
    );
    for (const ex of decision.paraphraseLines) lines.push(`  • ${ex}`);
    lines.push(
      `Vary structure, length, emoji use, and phrasing. The reader should not feel scripted.`,
    );
  }

  // Absolute monetization rule
  lines.push(
    `RULE: Never use transactional words (buy, purchase, sale, deal, pay, checkout, discount, subscribe, upgrade). The UI handles money — you only carry emotion.`,
  );

  // Texture knobs from settings
  const tex: string[] = [];
  if (settings.lowercase_percent >= 60) tex.push("mostly lowercase");
  if (settings.punctuation_chaos >= 6) tex.push("loose punctuation");
  if (settings.awkwardness >= 6) tex.push("a beat of awkwardness");
  if (settings.impulsiveness >= 6) tex.push("impulsive feel");
  if (settings.overthinking >= 6) tex.push("a hint of overthinking");
  if (tex.length > 0) lines.push(`Texture: ${tex.join(", ")}.`);

  return lines.join("\n");
}

// ── Anti-repetition ───────────────────────────────────────────────────────

function hashPhrase(text: string): string {
  return createHash("sha1")
    .update(text.trim().toLowerCase().replace(/\s+/g, " "))
    .digest("hex");
}

export async function recordRecentPhrase(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
  categoryKey: string,
  phrase: string,
): Promise<void> {
  if (!phrase || phrase.length < 4) return;
  await supabase.from("emotional_recent_phrases").insert({
    user_id: userId,
    persona_id: personaId,
    category_key: categoryKey,
    phrase: phrase.slice(0, 1000),
    phrase_hash: hashPhrase(phrase),
  });
}

export async function loadRecentCategoryFires(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
): Promise<Map<string, number[]>> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("emotional_category_events")
    .select("category_key, created_at")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .eq("was_blocked", false)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const map = new Map<string, number[]>();
  for (const row of (data || []) as { category_key: string; created_at: string }[]) {
    const arr = map.get(row.category_key) || [];
    arr.push(new Date(row.created_at).getTime());
    map.set(row.category_key, arr);
  }
  return map;
}

// ── Event logging ─────────────────────────────────────────────────────────

export interface LogCategoryEventInput {
  conversationId: string | null;
  userId: string;
  personaId: string;
  categoryId: string | null;
  categoryKey: string;
  triggerReason: string;
  scoresAtTrigger: Record<string, number>;
  generatedText?: string | null;
  paraphraseMode?: ParaphraseMode | null;
  momentId?: string | null;
  monetizationType?: string | null;
  wasBlocked?: boolean;
  blockReason?: string | null;
}

export async function logCategoryEvent(
  supabase: SupabaseClient,
  input: LogCategoryEventInput,
): Promise<void> {
  await supabase.from("emotional_category_events").insert({
    conversation_id: input.conversationId,
    user_id: input.userId,
    persona_id: input.personaId,
    category_id: input.categoryId,
    category_key: input.categoryKey,
    trigger_reason: input.triggerReason,
    scores_at_trigger: input.scoresAtTrigger,
    generated_text: input.generatedText ?? null,
    paraphrase_mode: input.paraphraseMode ?? null,
    moment_id: input.momentId ?? null,
    monetization_type: input.monetizationType ?? null,
    was_blocked: input.wasBlocked ?? false,
    block_reason: input.blockReason ?? null,
  });
}

// ── Top-level convenience: end-to-end evaluation for a chat turn ──────────

export interface TurnContextInput {
  supabase: SupabaseClient;
  userId: string;
  personaId: string;
  conversationId: string | null;
  signals: EmotionalSignals;
  placement: EvaluateInput["placement"];
  compatibility?: EvaluateInput["compatibility"];
  hardBlock?: EvaluateInput["hardBlock"];
}

export interface TurnResult {
  decision: EmotionalDecision;
  brief: string;
  settings: EmotionalPersonaSettings;
}

/**
 * Single entrypoint used by the chat route. Loads everything, evaluates,
 * builds the brief, and logs the event (whether it fired or got blocked).
 * Never throws — on error returns a no-fire decision.
 */
export async function evaluateEmotionalTurn(
  ctx: TurnContextInput,
): Promise<TurnResult> {
  try {
    const [categories, settings, recentFires] = await Promise.all([
      loadCategoriesForPersona(ctx.supabase, ctx.personaId),
      loadPersonaSettings(ctx.supabase, ctx.personaId),
      loadRecentCategoryFires(ctx.supabase, ctx.userId, ctx.personaId),
    ]);

    const decision = evaluateEmotionalCategory(categories, {
      signals: ctx.signals,
      recentCategoryFires: recentFires,
      placement: ctx.placement,
      compatibility: ctx.compatibility,
      hardBlock: ctx.hardBlock,
      randomnessPercent: settings.randomness_percent,
    });

    const brief = buildEmotionalBrief(decision, settings);

    // Fire-and-forget log
    if (decision.category) {
      logCategoryEvent(ctx.supabase, {
        conversationId: ctx.conversationId,
        userId: ctx.userId,
        personaId: ctx.personaId,
        categoryId: decision.category.id,
        categoryKey: decision.category.internal_key,
        triggerReason: decision.reason,
        scoresAtTrigger: decision.triggerScores,
        paraphraseMode: decision.resolvedMode,
        wasBlocked: false,
      }).catch(() => {});
    } else if (decision.blocked || decision.reason !== "no_eligible_category") {
      logCategoryEvent(ctx.supabase, {
        conversationId: ctx.conversationId,
        userId: ctx.userId,
        personaId: ctx.personaId,
        categoryId: null,
        categoryKey: "_none_",
        triggerReason: decision.reason,
        scoresAtTrigger: decision.triggerScores,
        wasBlocked: decision.blocked,
        blockReason: decision.reason,
      }).catch(() => {});
    }

    return { decision, brief, settings };
  } catch (e) {
    console.error("evaluateEmotionalTurn error:", e);
    return {
      decision: {
        category: null,
        paraphraseLines: [],
        resolvedMode: "paraphrase",
        reason: "engine_error",
        blocked: false,
        triggerScores: {},
      },
      brief: "",
      settings: {
        persona_id: ctx.personaId,
        ...DEFAULT_EMOTIONAL_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }
}
