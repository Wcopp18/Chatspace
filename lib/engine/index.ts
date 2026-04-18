/**
 * Core Experience Engine — barrel exports
 */

export {
  routeResponse,
  recordResponseUsage,
  logRoutingDecision,
  detectTopic,
  detectMood,
  type RoutingDecision,
} from "./response-router";

export {
  getTensionBand,
  calculateVisibleDelta,
  analyzeFlirtIntensity,
  analyzeMessage,
  analyzeEmotionalOpenness,
  calculateCooldownDrop,
  calculateRevealProbability,
  calculateRewardMomentum,
  evaluatePremiumEvent,
  selectPhrase,
  isSessionExpired,
  createFreshSessionState,
  updateTension,
  getOrCreateTensionState,
  getRewardDrop,
  type TensionUpdateResult,
  type MessageAnalysis,
  type SessionState,
  type PremiumEventDecision,
  type PremiumEventType,
  type PhraseResult,
} from "./tension-engine";

export {
  selectMomentForInjection,
  getMediaDeliveryStats,
  type InjectionCandidate,
} from "./media-injection";

export {
  extractMemories,
  saveMemories,
  getMemories,
  selectCallback,
  generateCallbacks,
} from "./memory-engine";

// ── New Experience Systems ──

export {
  scoreMessageQuality,
  getMessageHash,
  extractTopics,
  type MessageQualityResult,
  type QualityLabel,
} from "./message-quality";

export {
  generateDailyVibe,
  getOrGenerateDailyVibe,
  buildVibePromptContext,
  VIBE_PROMPTS,
  type VibeType,
  type DailyVibe,
} from "./daily-vibe";

export {
  getChemistryZone,
  calculateChemistryDelta,
  getOrCreateSessionChemistry,
  updateSessionChemistry,
  buildChemistryPromptContext,
  CHEMISTRY_PROMPTS,
  type ChemistryState,
  type ChemistryZone,
} from "./session-chemistry";

export {
  getRelationshipLevels,
  getLevelRewards,
  getUserProgress,
  addXpAndCheckLevelUp,
  buildRelationshipPromptContext,
  DEFAULT_LEVELS,
  type RelationshipLevel,
  type LevelReward,
  type UserProgress,
  type LevelUpResult,
} from "./relationship-levels";

export {
  getOrCreateHiddenProgress,
  updateHiddenProgress,
  recordSurpriseDelivered,
  type HiddenProgressState,
} from "./hidden-progress";

export {
  evaluateSurpriseGesture,
  type SurpriseGesture,
  type GestureType,
} from "./surprise-gestures";

export {
  evaluateAntiGaming,
  getOrCreateAntiGaming,
  resetDailyAntiGaming,
  type AntiGamingState,
  type AntiGamingResult,
} from "./anti-gaming";

export {
  evaluateFirstReveal,
  selectLeadIn,
  recordPromptEvent,
  getProfileSubscriptionState,
  FIRST_REVEAL_THRESHOLDS,
  type FirstRevealContext,
  type FirstRevealDecision,
  type PromptEventInput,
} from "./subscription-trigger";

export {
  countUserMessagesToday,
  isOverFreeLimit,
  type FreeLimitResult,
} from "./message-quota";
