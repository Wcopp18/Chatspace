// Monetization constants - hardcoded for MVP, override per-girl via creator panel
export const PRICING = {
  SUBSCRIPTION_MONTHLY: 9.99,
  IMAGE_UNLOCK: 2.99,
  VIDEO_UNLOCK: 4.99,
  EMOTIONAL_CONTINUATION: 2.00,
} as const;

export const STRIPE_PRICES = {
  SUBSCRIPTION_MONTHLY: process.env.STRIPE_PRICE_SUBSCRIPTION || "price_subscription_monthly",
  IMAGE_UNLOCK: process.env.STRIPE_PRICE_IMAGE || "price_image_unlock",
  VIDEO_UNLOCK: process.env.STRIPE_PRICE_VIDEO || "price_video_unlock",
  CONTINUATION: process.env.STRIPE_PRICE_CONTINUATION || "price_continuation",
} as const;

export const CONVERSATION_LIMITS = {
  FREE_MESSAGES: 10,
  CONTINUATION_TRIGGER_MESSAGES: 20,
  CONTINUATION_TRIGGER_EMOTION_SCORE: 0.7,
  CONTINUATION_COOLDOWN_MINUTES: 30,
} as const;

export const MEDIA_TYPES = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export const LOCK_STATES = {
  LOCKED: "locked",
  UNLOCKED: "unlocked",
  SIDEBAR: "sidebar",
} as const;

export const AI_PROVIDERS = {
  CLAUDE: "claude",
  OPENAI: "openai",
  OPENROUTER: "openrouter",
} as const;

export const TEXTING_STYLES = {
  PLAYFUL: "playful",
  FLIRTY: "flirty",
  MYSTERIOUS: "mysterious",
  WHOLESOME: "wholesome",
  EDGY: "edgy",
} as const;
