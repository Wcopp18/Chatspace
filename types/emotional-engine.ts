/**
 * Emotional Engine — TypeScript types
 *
 * Mirrors the SQL schema in `supabase/migrations/20260507000000_emotional_engine.sql`.
 * Used by the engine module (`lib/engine/emotional-engine.ts`) and the Creator
 * Panel UI/API.
 */

export type ParaphraseMode = "exact" | "paraphrase" | "ai_generate";

export type EmotionalPlacement =
  | "before_media"
  | "after_media"
  | "delayed_followup"
  | "expiration_event"
  | "continue_chat"
  | "subscription_prompt"
  | "normal_chat";

export interface EmotionalCategory {
  id: string;
  internal_key: string;
  display_name: string;
  description: string;
  value_to_app: string;
  creator_notes: string;
  enabled: boolean;

  paraphrase_mode: ParaphraseMode;
  paraphrase_strength: number;
  intensity: number;
  emotional_tone: string;

  compat_image: boolean;
  compat_video: boolean;
  compat_multi_media: boolean;
  compat_continue_chat: boolean;
  compat_subscription: boolean;
  compat_expiration: boolean;
  compat_delayed_followup: boolean;

  place_before_media: boolean;
  place_after_media: boolean;
  place_delayed_followup: boolean;
  place_expiration_event: boolean;
  place_continue_chat: boolean;
  place_subscription_prompt: boolean;
  place_normal_chat: boolean;

  min_total_messages: number;
  min_user_messages: number;
  min_ai_messages: number;
  min_back_and_forth_count: number;
  min_session_duration_seconds: number;
  min_conversation_quality_score: number;
  min_emotional_momentum_score: number;
  min_flirtiness_score: number;
  min_vulnerability_score: number;
  min_trust_score: number;
  min_engagement_score: number;
  min_attachment_score: number;
  min_time_since_last_media_seconds: number;
  min_time_since_last_monetization_seconds: number;
  min_time_since_last_same_category_seconds: number;

  max_same_category_uses_per_conversation: number;
  max_same_category_uses_per_day: number;
  cooldown_seconds: number;
  probability_weight: number;

  behavior_config: Record<string, unknown>;
  follow_up_category_keys: string[];
  forbidden_combination_keys: string[];

  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EmotionalCategoryExample {
  id: string;
  category_id: string;
  line: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface EmotionalCategoryOverride {
  id: string;
  persona_id: string;
  category_id: string;
  enabled_override: boolean | null;
  override_patch: Record<string, unknown>;
  trigger_overrides: Record<string, unknown>;
  style_overrides: Record<string, unknown>;
  custom_examples: string[];
  created_at: string;
  updated_at: string;
}

export interface EmotionalSignalWeight {
  id: string;
  persona_id: string | null;
  signal_key: string;
  weight: number;
  enabled: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface EmotionalPersonaSettings {
  persona_id: string;

  min_messages_before_media: number;
  min_messages_before_multi_media: number;
  continue_chat_cooldown_seconds: number;
  subscription_cooldown_seconds: number;
  randomness_percent: number;
  monetization_pacing_speed: "slow" | "medium" | "fast";
  emotional_pacing_speed: "slow" | "medium" | "fast";

  leaving_style: string;
  leaving_reluctance: number;
  leaving_min_session_messages: number;
  leaving_min_session_duration_seconds: number;
  leaving_max_prompts_per_day: number;

  positive_signals: string[];
  negative_signals: string[];
  reaction_style: string;
  recovery_speed: number;

  memory_strength: number;
  attachment_speed: number;
  callback_frequency: number;
  remembered_categories: string[];

  phrase_cooldown_seconds: number;
  similarity_threshold: number;
  max_phrase_reuse: number;
  awkwardness: number;
  impulsiveness: number;
  overthinking: number;
  hesitation: number;
  lowercase_percent: number;
  punctuation_chaos: number;
  emoji_randomness: number;
  typo_frequency: number;

  created_at: string;
  updated_at: string;
}

export interface EmotionalCategoryEvent {
  id: string;
  conversation_id: string | null;
  user_id: string | null;
  persona_id: string | null;
  category_id: string | null;
  category_key: string;
  trigger_reason: string;
  scores_at_trigger: Record<string, number>;
  generated_text: string | null;
  paraphrase_mode: ParaphraseMode | null;
  moment_id: string | null;
  monetization_type: string | null;
  was_blocked: boolean;
  block_reason: string | null;
  created_at: string;
}

/**
 * Live signals fed into the trigger evaluator at runtime.
 * Filled by the chat route from the existing tension/chemistry/quality scores.
 */
export interface EmotionalSignals {
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  backAndForthCount: number;
  sessionDurationSeconds: number;
  conversationQualityScore: number;
  emotionalMomentumScore: number;
  flirtinessScore: number;
  vulnerabilityScore: number;
  trustScore: number;
  engagementScore: number;
  attachmentScore: number;
  timeSinceLastMediaSeconds: number;
  timeSinceLastMonetizationSeconds: number;
  hadIgnoredMedia: boolean;
  hadDirectRejection: boolean;
  isLateNight: boolean;
  isSubscribed: boolean;
}

/**
 * The decision the engine emits per turn.
 * `category` is null when nothing fires (most turns).
 */
export interface EmotionalDecision {
  category: EmotionalCategory | null;
  paraphraseLines: string[];      // selected style references
  resolvedMode: ParaphraseMode;
  reason: string;                 // why this fired (or why it didn't)
  blocked: boolean;
  triggerScores: Record<string, number>;
}
