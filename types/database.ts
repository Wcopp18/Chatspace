export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          message_count?: number;
          emotion_score?: number;
          last_continuation_at?: string | null;
          is_active?: boolean;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          metadata?: Json | null;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          memory_value?: string;
          importance?: number;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
