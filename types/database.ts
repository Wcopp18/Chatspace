export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enum types matching DB
export type ResponseSource = 'prewritten' | 'claude' | 'hybrid';
export type TensionBand = 'warming_up' | 'image_zone' | 'premium_zone' | 'video_zone';
export type RequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'delivered' | 'rejected';
export type ArcStatus = 'active' | 'paused' | 'completed' | 'upcoming';
export type VaultEventStatus = 'scheduled' | 'active' | 'expired';
export type NotificationType =
  | 'story_continuation' | 'promised_drop' | 'tension_reminder'
  | 'streak_protection' | 'vault_event' | 'limited_unlock'
  | 'seasonal_arc' | 'life_event' | 'custom_delivery';
export type MemoryCategory =
  | 'favorite' | 'emotional_weak_point' | 'fantasy' | 'inside_joke'
  | 'custom_request_ref' | 'unlock_reaction' | 'anniversary'
  | 'streak_milestone' | 'promise' | 'preference' | 'life_detail';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          is_subscribed: boolean;
          is_admin: boolean;
          subscription_expires_at: string | null;
          first_subscription_prompt_at: string | null;
          subscription_dismissed_until: string | null;
          push_token: string | null;
          push_enabled: boolean;
          timezone: string;
          total_purchases: number;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          is_subscribed?: boolean;
          is_admin?: boolean;
          subscription_expires_at?: string | null;
          first_subscription_prompt_at?: string | null;
          subscription_dismissed_until?: string | null;
          push_token?: string | null;
          push_enabled?: boolean;
          timezone?: string;
          total_purchases?: number;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          is_subscribed?: boolean;
          is_admin?: boolean;
          subscription_expires_at?: string | null;
          first_subscription_prompt_at?: string | null;
          subscription_dismissed_until?: string | null;
          push_token?: string | null;
          push_enabled?: boolean;
          timezone?: string;
          total_purchases?: number;
          total_spent?: number;
          updated_at?: string;
        };
      };
      personas: {
        Row: {
          id: string;
          slug: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          warmth: number;
          tease_level: number;
          texting_style: string;
          emoji_style: string;
          sentence_length: string;
          pacing_style: string;
          continuation_style: string;
          continuation_frequency: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          warmth?: number;
          tease_level?: number;
          texting_style?: string;
          emoji_style?: string;
          sentence_length?: string;
          pacing_style?: string;
          continuation_style?: string;
          continuation_frequency?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          warmth?: number;
          tease_level?: number;
          texting_style?: string;
          emoji_style?: string;
          sentence_length?: string;
          pacing_style?: string;
          continuation_style?: string;
          continuation_frequency?: number;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      persona_phrase_bank: {
        Row: {
          id: string;
          persona_id: string;
          phrase_type: string;
          phrase: string;
          weight: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          phrase_type: string;
          phrase: string;
          weight?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          phrase_type?: string;
          phrase?: string;
          weight?: number;
          is_active?: boolean;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          message_count: number;
          emotion_score: number;
          last_continuation_at: string | null;
          is_active: boolean;
          total_prewritten_count: number;
          total_claude_count: number;
          current_tension_score: number;
          session_streak: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          message_count?: number;
          emotion_score?: number;
          last_continuation_at?: string | null;
          is_active?: boolean;
          total_prewritten_count?: number;
          total_claude_count?: number;
          current_tension_score?: number;
          session_streak?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          message_count?: number;
          emotion_score?: number;
          last_continuation_at?: string | null;
          is_active?: boolean;
          total_prewritten_count?: number;
          total_claude_count?: number;
          current_tension_score?: number;
          session_streak?: number;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata: Json | null;
          source: string;
          prewritten_response_id: string | null;
          tension_delta: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata?: Json | null;
          source?: string;
          prewritten_response_id?: string | null;
          tension_delta?: number | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          metadata?: Json | null;
          source?: string;
          prewritten_response_id?: string | null;
          tension_delta?: number | null;
        };
      };
      moments: {
        Row: {
          id: string;
          persona_id: string;
          title: string;
          tease_copy: string;
          media_type: string;
          media_url: string | null;
          thumbnail_url: string | null;
          price: number;
          expires_at: string | null;
          lock_state: string;
          auto_move_to_sidebar: boolean;
          sidebar_delay_minutes: number;
          is_active: boolean;
          sort_order: number;
          tags: string[];
          rarity_tier: string;
          min_tension_score: number;
          mood_tags: string[];
          story_arc_id: string | null;
          vault_event_id: string | null;
          is_custom_delivery: boolean;
          delivered_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          title: string;
          tease_copy: string;
          media_type: string;
          media_url?: string | null;
          thumbnail_url?: string | null;
          price?: number;
          expires_at?: string | null;
          lock_state?: string;
          auto_move_to_sidebar?: boolean;
          sidebar_delay_minutes?: number;
          is_active?: boolean;
          sort_order?: number;
          tags?: string[];
          rarity_tier?: string;
          min_tension_score?: number;
          mood_tags?: string[];
          story_arc_id?: string | null;
          vault_event_id?: string | null;
          is_custom_delivery?: boolean;
          delivered_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          tease_copy?: string;
          media_type?: string;
          media_url?: string | null;
          thumbnail_url?: string | null;
          price?: number;
          expires_at?: string | null;
          lock_state?: string;
          auto_move_to_sidebar?: boolean;
          sidebar_delay_minutes?: number;
          is_active?: boolean;
          sort_order?: number;
          tags?: string[];
          rarity_tier?: string;
          min_tension_score?: number;
          mood_tags?: string[];
          story_arc_id?: string | null;
          vault_event_id?: string | null;
          is_custom_delivery?: boolean;
          delivered_count?: number;
          updated_at?: string;
        };
      };
      moment_unlocks: {
        Row: {
          id: string;
          user_id: string;
          moment_id: string;
          amount_paid: number;
          stripe_payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          moment_id: string;
          amount_paid: number;
          stripe_payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          stripe_payment_id?: string | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          status: string;
          price_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
      };
      persona_memories: {
        Row: {
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
        };
        Insert: {
          id?: string;
          persona_id: string;
          user_id: string;
          memory_key: string;
          memory_value: string;
          importance?: number;
          category?: string;
          source?: string;
          last_referenced_at?: string | null;
          reference_count?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          memory_value?: string;
          importance?: number;
          category?: string;
          source?: string;
          last_referenced_at?: string | null;
          reference_count?: number;
          expires_at?: string | null;
          updated_at?: string;
        };
      };
      creator_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          setting_value?: Json;
          updated_at?: string;
        };
      };
      persona_assets: {
        Row: {
          id: string;
          persona_id: string;
          asset_type: string;
          asset_url: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          asset_type: string;
          asset_url: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          asset_url?: string;
          metadata?: Json | null;
        };
      };
      continuation_prompts: {
        Row: {
          id: string;
          persona_id: string;
          trigger_type: string;
          continuation_line: string;
          popup_cta: string;
          price: number;
          cooldown_minutes: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          trigger_type: string;
          continuation_line: string;
          popup_cta: string;
          price?: number;
          cooldown_minutes?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          trigger_type?: string;
          continuation_line?: string;
          popup_cta?: string;
          price?: number;
          cooldown_minutes?: number;
          is_active?: boolean;
        };
      };
      continuation_unlocks: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          prompt_id: string;
          amount_paid: number;
          stripe_payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          prompt_id: string;
          amount_paid: number;
          stripe_payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          stripe_payment_id?: string | null;
        };
      };
      prewritten_responses: {
        Row: {
          id: string;
          persona_id: string;
          topic_tag: string;
          mood_tag: string;
          tension_band: TensionBand;
          content: string;
          semantic_group: string;
          cooldown_seconds: number;
          weight: number;
          trigger_patterns: string[];
          min_message_count: number;
          max_message_count: number | null;
          requires_memory_key: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          topic_tag: string;
          mood_tag: string;
          tension_band?: TensionBand;
          content: string;
          semantic_group: string;
          cooldown_seconds?: number;
          weight?: number;
          trigger_patterns?: string[];
          min_message_count?: number;
          max_message_count?: number | null;
          requires_memory_key?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          topic_tag?: string;
          mood_tag?: string;
          tension_band?: TensionBand;
          content?: string;
          semantic_group?: string;
          cooldown_seconds?: number;
          weight?: number;
          trigger_patterns?: string[];
          min_message_count?: number;
          max_message_count?: number | null;
          requires_memory_key?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      response_usage: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          response_id: string;
          semantic_group: string;
          used_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          response_id: string;
          semantic_group: string;
          used_at?: string;
        };
        Update: {};
      };
      media_delivery_history: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          moment_id: string;
          delivered_at: string;
          was_unlocked: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          moment_id: string;
          delivered_at?: string;
          was_unlocked?: boolean;
        };
        Update: {
          was_unlocked?: boolean;
        };
      };
      tension_state: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          conversation_id: string | null;
          score: number;
          current_band: TensionBand;
          peak_score: number;
          last_reward_at: string | null;
          cooldown_until: string | null;
          rewards_this_session: number;
          session_message_count: number;
          session_started_at: string;
          daily_streak: number;
          last_active_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          conversation_id?: string | null;
          score?: number;
          current_band?: TensionBand;
          peak_score?: number;
          last_reward_at?: string | null;
          cooldown_until?: string | null;
          rewards_this_session?: number;
          session_message_count?: number;
          session_started_at?: string;
          daily_streak?: number;
          last_active_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          conversation_id?: string | null;
          score?: number;
          current_band?: TensionBand;
          peak_score?: number;
          last_reward_at?: string | null;
          cooldown_until?: string | null;
          rewards_this_session?: number;
          session_message_count?: number;
          session_started_at?: string;
          daily_streak?: number;
          last_active_date?: string | null;
          updated_at?: string;
        };
      };
      tension_events: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          conversation_id: string | null;
          event_type: string;
          score_before: number;
          score_after: number;
          score_delta: number;
          band_before: TensionBand | null;
          band_after: TensionBand | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          conversation_id?: string | null;
          event_type: string;
          score_before: number;
          score_after: number;
          score_delta: number;
          band_before?: TensionBand | null;
          band_after?: TensionBand | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {};
      };
      custom_requests: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          conversation_id: string | null;
          scene_idea: string;
          outfit: string | null;
          location_vibe: string | null;
          mood: string | null;
          style_references: string | null;
          custom_notes: string | null;
          pricing_tier: string;
          price: number | null;
          status: RequestStatus;
          admin_notes: string | null;
          rejection_reason: string | null;
          delivered_moment_id: string | null;
          delivery_teaser_line: string | null;
          submitted_at: string;
          approved_at: string | null;
          completed_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          conversation_id?: string | null;
          scene_idea: string;
          outfit?: string | null;
          location_vibe?: string | null;
          mood?: string | null;
          style_references?: string | null;
          custom_notes?: string | null;
          pricing_tier?: string;
          price?: number | null;
          status?: RequestStatus;
          admin_notes?: string | null;
          rejection_reason?: string | null;
          delivered_moment_id?: string | null;
          delivery_teaser_line?: string | null;
          submitted_at?: string;
          approved_at?: string | null;
          completed_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          scene_idea?: string;
          outfit?: string | null;
          location_vibe?: string | null;
          mood?: string | null;
          style_references?: string | null;
          custom_notes?: string | null;
          pricing_tier?: string;
          price?: number | null;
          status?: RequestStatus;
          admin_notes?: string | null;
          rejection_reason?: string | null;
          delivered_moment_id?: string | null;
          delivery_teaser_line?: string | null;
          approved_at?: string | null;
          completed_at?: string | null;
          delivered_at?: string | null;
          updated_at?: string;
        };
      };
      story_arcs: {
        Row: {
          id: string;
          persona_id: string;
          title: string;
          description: string | null;
          arc_type: string;
          total_stages: number;
          start_date: string | null;
          estimated_duration_days: number | null;
          status: ArcStatus;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          title: string;
          description?: string | null;
          arc_type: string;
          total_stages?: number;
          start_date?: string | null;
          estimated_duration_days?: number | null;
          status?: ArcStatus;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          arc_type?: string;
          total_stages?: number;
          start_date?: string | null;
          estimated_duration_days?: number | null;
          status?: ArcStatus;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      story_arc_stages: {
        Row: {
          id: string;
          arc_id: string;
          stage_number: number;
          title: string;
          description: string | null;
          dialogue_lines: string[];
          callback_references: string[];
          trigger_type: string;
          trigger_value: Json;
          reward_moment_id: string | null;
          push_notification_text: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          arc_id: string;
          stage_number: number;
          title: string;
          description?: string | null;
          dialogue_lines?: string[];
          callback_references?: string[];
          trigger_type?: string;
          trigger_value?: Json;
          reward_moment_id?: string | null;
          push_notification_text?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          dialogue_lines?: string[];
          callback_references?: string[];
          trigger_type?: string;
          trigger_value?: Json;
          reward_moment_id?: string | null;
          push_notification_text?: string | null;
          is_active?: boolean;
        };
      };
      user_arc_progress: {
        Row: {
          id: string;
          user_id: string;
          arc_id: string;
          current_stage: number;
          started_at: string;
          last_stage_at: string | null;
          completed_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          arc_id: string;
          current_stage?: number;
          started_at?: string;
          last_stage_at?: string | null;
          completed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          current_stage?: number;
          last_stage_at?: string | null;
          completed_at?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
      };
      ritual_schedules: {
        Row: {
          id: string;
          persona_id: string;
          ritual_type: string;
          time_window_start: string;
          time_window_end: string;
          days_of_week: number[];
          dialogue_lines: string[];
          reward_moment_id: string | null;
          reward_probability: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          ritual_type: string;
          time_window_start: string;
          time_window_end: string;
          days_of_week?: number[];
          dialogue_lines?: string[];
          reward_moment_id?: string | null;
          reward_probability?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ritual_type?: string;
          time_window_start?: string;
          time_window_end?: string;
          days_of_week?: number[];
          dialogue_lines?: string[];
          reward_moment_id?: string | null;
          reward_probability?: number;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      user_ritual_state: {
        Row: {
          id: string;
          user_id: string;
          ritual_id: string;
          last_triggered_at: string | null;
          times_triggered: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ritual_id: string;
          last_triggered_at?: string | null;
          times_triggered?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          last_triggered_at?: string | null;
          times_triggered?: number;
          updated_at?: string;
        };
      };
      milestones: {
        Row: {
          id: string;
          milestone_key: string;
          title: string;
          description: string | null;
          reward_type: string | null;
          reward_config: Json;
          requirement_type: string;
          requirement_value: Json;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          milestone_key: string;
          title: string;
          description?: string | null;
          reward_type?: string | null;
          reward_config?: Json;
          requirement_type: string;
          requirement_value: Json;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          milestone_key?: string;
          title?: string;
          description?: string | null;
          reward_type?: string | null;
          reward_config?: Json;
          requirement_type?: string;
          requirement_value?: Json;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      user_milestones: {
        Row: {
          id: string;
          user_id: string;
          milestone_id: string;
          persona_id: string | null;
          unlocked_at: string;
          reward_claimed: boolean;
          reward_claimed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          milestone_id: string;
          persona_id?: string | null;
          unlocked_at?: string;
          reward_claimed?: boolean;
          reward_claimed_at?: string | null;
          created_at?: string;
        };
        Update: {
          reward_claimed?: boolean;
          reward_claimed_at?: string | null;
        };
      };
      vault_events: {
        Row: {
          id: string;
          persona_id: string;
          title: string;
          description: string | null;
          event_type: string;
          starts_at: string;
          ends_at: string;
          min_streak_days: number;
          min_total_purchases: number;
          subscriber_only: boolean;
          status: VaultEventStatus;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          title: string;
          description?: string | null;
          event_type: string;
          starts_at: string;
          ends_at: string;
          min_streak_days?: number;
          min_total_purchases?: number;
          subscriber_only?: boolean;
          status?: VaultEventStatus;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          event_type?: string;
          starts_at?: string;
          ends_at?: string;
          min_streak_days?: number;
          min_total_purchases?: number;
          subscriber_only?: boolean;
          status?: VaultEventStatus;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      push_events: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          notification_type: NotificationType;
          title: string;
          body: string;
          conversation_id: string | null;
          moment_id: string | null;
          arc_id: string | null;
          vault_event_id: string | null;
          scheduled_for: string;
          sent_at: string | null;
          opened_at: string | null;
          is_sent: boolean;
          is_opened: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          notification_type: NotificationType;
          title: string;
          body: string;
          conversation_id?: string | null;
          moment_id?: string | null;
          arc_id?: string | null;
          vault_event_id?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          opened_at?: string | null;
          is_sent?: boolean;
          is_opened?: boolean;
          created_at?: string;
        };
        Update: {
          sent_at?: string | null;
          opened_at?: string | null;
          is_sent?: boolean;
          is_opened?: boolean;
        };
      };
      life_events: {
        Row: {
          id: string;
          persona_id: string;
          event_type: string;
          dialogue_line: string;
          time_of_day: string | null;
          days_of_week: number[];
          moment_id: string | null;
          weight: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          event_type: string;
          dialogue_line: string;
          time_of_day?: string | null;
          days_of_week?: number[];
          moment_id?: string | null;
          weight?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          event_type?: string;
          dialogue_line?: string;
          time_of_day?: string | null;
          days_of_week?: number[];
          moment_id?: string | null;
          weight?: number;
          is_active?: boolean;
        };
      };
      user_life_event_log: {
        Row: {
          id: string;
          user_id: string;
          life_event_id: string;
          conversation_id: string | null;
          delivered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          life_event_id: string;
          conversation_id?: string | null;
          delivered_at?: string;
        };
        Update: {};
      };
      cross_persona_references: {
        Row: {
          id: string;
          source_persona_id: string;
          target_persona_id: string;
          reference_type: string;
          dialogue_lines: string[];
          min_user_conversations: number;
          weight: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_persona_id: string;
          target_persona_id: string;
          reference_type: string;
          dialogue_lines?: string[];
          min_user_conversations?: number;
          weight?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          reference_type?: string;
          dialogue_lines?: string[];
          min_user_conversations?: number;
          weight?: number;
          is_active?: boolean;
        };
      };
      routing_decisions: {
        Row: {
          id: string;
          conversation_id: string;
          user_message: string;
          confidence_score: number;
          route_chosen: string;
          prewritten_response_id: string | null;
          topic_detected: string | null;
          mood_detected: string | null;
          tension_at_time: number | null;
          response_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_message: string;
          confidence_score: number;
          route_chosen: string;
          prewritten_response_id?: string | null;
          topic_detected?: string | null;
          mood_detected?: string | null;
          tension_at_time?: number | null;
          response_text?: string | null;
          created_at?: string;
        };
        Update: {};
      };
      relationship_levels: {
        Row: {
          id: string;
          persona_id: string;
          level_number: number;
          level_name: string;
          xp_required: number;
          description: string | null;
          color_hex: string;
          icon: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          level_number: number;
          level_name: string;
          xp_required: number;
          description?: string | null;
          color_hex?: string;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          level_name?: string;
          xp_required?: number;
          description?: string | null;
          color_hex?: string;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
      };
      relationship_level_rewards: {
        Row: {
          id: string;
          level_id: string;
          persona_id: string;
          media_type: string;
          media_url: string | null;
          thumbnail_url: string | null;
          caption: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          level_id: string;
          persona_id: string;
          media_type: string;
          media_url?: string | null;
          thumbnail_url?: string | null;
          caption?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          media_type?: string;
          media_url?: string | null;
          thumbnail_url?: string | null;
          caption?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      user_relationship_progress: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          current_level: number;
          current_xp: number;
          total_xp_earned: number;
          total_messages_sent: number;
          total_quality_messages: number;
          longest_streak: number;
          current_streak: number;
          last_message_date: string | null;
          level_completed_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          current_level?: number;
          current_xp?: number;
          total_xp_earned?: number;
          total_messages_sent?: number;
          total_quality_messages?: number;
          longest_streak?: number;
          current_streak?: number;
          last_message_date?: string | null;
          level_completed_count?: number;
        };
        Update: {
          current_level?: number;
          current_xp?: number;
          total_xp_earned?: number;
          total_messages_sent?: number;
          total_quality_messages?: number;
          longest_streak?: number;
          current_streak?: number;
          last_message_date?: string | null;
          level_completed_count?: number;
        };
      };
      daily_vibes: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          vibe_date: string;
          vibe: string;
          intensity: number;
          generated_from: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          vibe_date?: string;
          vibe: string;
          intensity?: number;
          generated_from?: Json;
        };
        Update: {
          vibe?: string;
          intensity?: number;
          generated_from?: Json;
        };
      };
      session_chemistry: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          conversation_id: string | null;
          score: number;
          peak_score: number;
          good_message_count: number;
          bad_message_count: number;
          total_session_messages: number;
          positive_streak: number;
          session_started_at: string;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          conversation_id?: string | null;
          score?: number;
          peak_score?: number;
          good_message_count?: number;
          bad_message_count?: number;
          total_session_messages?: number;
          positive_streak?: number;
        };
        Update: {
          score?: number;
          peak_score?: number;
          good_message_count?: number;
          bad_message_count?: number;
          total_session_messages?: number;
          positive_streak?: number;
          last_message_at?: string;
        };
      };
      hidden_progress: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          relationship_momentum: number;
          consistency_score: number;
          surprise_readiness: number;
          next_reward_boost: number;
          consecutive_good_days: number;
          total_good_sessions: number;
          messages_since_last_reward: number;
          days_since_last_reward: number;
          repetition_penalty: number;
          burst_penalty: number;
          topic_diversity_score: number;
          last_reward_at: string | null;
          last_good_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
        };
        Update: {
          relationship_momentum?: number;
          consistency_score?: number;
          surprise_readiness?: number;
          next_reward_boost?: number;
          consecutive_good_days?: number;
          total_good_sessions?: number;
          messages_since_last_reward?: number;
          days_since_last_reward?: number;
          repetition_penalty?: number;
          burst_penalty?: number;
          topic_diversity_score?: number;
          last_reward_at?: string | null;
          last_good_message_at?: string | null;
        };
      };
      surprise_gestures: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          conversation_id: string | null;
          gesture_type: string;
          reward_id: string | null;
          trigger_reason: string;
          relationship_level: number | null;
          chemistry_score: number | null;
          daily_vibe: string | null;
          cooldown_until: string | null;
          delivered_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          conversation_id?: string | null;
          gesture_type: string;
          reward_id?: string | null;
          trigger_reason: string;
          relationship_level?: number | null;
          chemistry_score?: number | null;
          daily_vibe?: string | null;
          cooldown_until?: string | null;
        };
        Update: {};
      };
      message_quality_log: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          conversation_id: string | null;
          message_id: string | null;
          quality_label: string;
          quality_score: number;
          effort_score: number;
          warmth_score: number;
          relevance_score: number;
          repetition_score: number;
          spam_score: number;
          xp_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          quality_label: string;
          quality_score: number;
          effort_score?: number;
          warmth_score?: number;
          relevance_score?: number;
          repetition_score?: number;
          spam_score?: number;
          xp_awarded?: number;
        };
        Update: {};
      };
      anti_gaming_state: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          recent_message_hashes: string[];
          recent_topics: string[];
          burst_count: number;
          burst_window_start: string | null;
          repeat_count: number;
          same_topic_count: number;
          reward_count_today: number;
          reward_count_date: string | null;
          diminishing_factor: number;
          hard_cooldown_until: string | null;
          soft_cooldown_until: string | null;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          recent_message_hashes?: string[];
          recent_topics?: string[];
        };
        Update: {
          recent_message_hashes?: string[];
          recent_topics?: string[];
          burst_count?: number;
          burst_window_start?: string | null;
          repeat_count?: number;
          same_topic_count?: number;
          reward_count_today?: number;
          reward_count_date?: string | null;
          diminishing_factor?: number;
          hard_cooldown_until?: string | null;
          soft_cooldown_until?: string | null;
          last_message_at?: string | null;
        };
      };
      user_level_reward_claims: {
        Row: {
          id: string;
          user_id: string;
          reward_id: string;
          level_id: string;
          persona_id: string;
          claimed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_id: string;
          level_id: string;
          persona_id: string;
        };
        Update: {};
      };
      subscription_prompt_events: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          conversation_id: string | null;
          event_type: 'impression' | 'dismiss' | 'click' | 'trial_start' | 'reveal';
          chemistry_score: number | null;
          tension_score: number | null;
          relationship_momentum: number | null;
          message_quality_label: string | null;
          context: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          conversation_id?: string | null;
          event_type: 'impression' | 'dismiss' | 'click' | 'trial_start' | 'reveal';
          chemistry_score?: number | null;
          tension_score?: number | null;
          relationship_momentum?: number | null;
          message_quality_label?: string | null;
          context?: Json;
        };
        Update: {};
      };
    };
    Views: {};
    Functions: {
      get_tension_band: {
        Args: { score: number };
        Returns: TensionBand;
      };
      calculate_reveal_probability: {
        Args: {
          p_tension_score: number;
          p_message_count: number;
          p_last_reward_minutes: number;
          p_streak_days: number;
        };
        Returns: number;
      };
    };
    Enums: {
      response_source: ResponseSource;
      tension_band: TensionBand;
      request_status: RequestStatus;
      arc_status: ArcStatus;
      vault_event_status: VaultEventStatus;
      notification_type: NotificationType;
      memory_category: MemoryCategory;
    };
  };
}
