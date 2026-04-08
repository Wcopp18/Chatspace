/**
 * Promotion & Event System Types
 *
 * These types power the in-chat event injection engine.
 * Every promotion surface is configurable per girl.
 */

export type PromotionType =
  | "media_teaser"
  | "timer_urgency"
  | "bundle_rail"
  | "discovery_circles"
  | "reward_progress";

export type PromotionStatus = "active" | "disabled" | "archived";

export interface TriggerRules {
  minMessageExchanges: number;   // min messages before eligible
  tensionThreshold: number;      // min tension score (0-100)
  weight: number;                // relative probability weight (1-100)
  cooldownMinutes: number;       // min minutes between same type
  priority: number;              // higher = shown first when multiple eligible
  maxPerSession: number;         // max times shown per session
  requiresUnlockHistory: boolean; // only show to users who've unlocked before
  tensionBandFilter: string[];   // which tension bands allow this ("warming_up", "image_zone", etc.)
}

export interface Promotion {
  id: string;
  type: PromotionType;
  personaId: string | null;      // null = global (all girls)
  personaIds: string[];          // multi-select assignment
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaAction: string;             // "unlock" | "purchase" | "navigate" | "deeplink"

  // Media teaser fields
  previewImageUrl: string | null;
  previewVideoUrl: string | null;
  headline: string;

  // Timer urgency fields
  timerDurationMinutes: number;
  originalPrice: number | null;
  promoPrice: number | null;

  // Bundle rail fields
  bundleTitle: string;
  bundleItems: BundleItem[];

  // Discovery circles fields
  recommendedPersonaIds: string[];

  // Reward progress fields
  progressCopy: string;
  nextRewardLabel: string;
  requiredActions: number;

  // Trigger rules
  triggerRules: TriggerRules;

  // Status
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BundleItem {
  id: string;
  momentId: string;
  title: string;
  thumbnailUrl: string | null;
  price: number;
  imageCount?: number;
  isBestValue?: boolean;
}

// Event engine state tracking
export interface EventSessionState {
  sessionStartedAt: number;
  messageExchangeCount: number;
  tensionScore: number;
  tensionBand: string;
  lastEventAt: number | null;
  lastEventType: PromotionType | null;
  eventHistory: EventHistoryEntry[];
  unlockHistory: string[];
  purchaseCount: number;
  inactivitySeconds: number;
}

export interface EventHistoryEntry {
  promotionId: string;
  type: PromotionType;
  shownAt: number;
  interacted: boolean;
}

export interface EventDecision {
  shouldInject: boolean;
  promotion: Promotion | null;
  reason: string;
}

// Creator panel types
export interface PromotionFormData {
  type: PromotionType;
  personaIds: string[];
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  headline: string;
  previewImageUrl: string;
  timerDurationMinutes: number;
  originalPrice: number;
  promoPrice: number;
  bundleTitle: string;
  progressCopy: string;
  nextRewardLabel: string;
  requiredActions: number;
  triggerRules: TriggerRules;
  status: PromotionStatus;
}
