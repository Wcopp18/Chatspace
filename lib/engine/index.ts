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

export {
  calculateXpForMessage,
  awardRelationshipXp,
  getActiveLevels,
  getOrCreateProgress,
  getRelationshipSnapshot,
  type RelationshipLevel,
  type RelationshipLevelReward,
  type UserRelationshipProgress,
  type DeliveredReward,
  type XpAwardResult,
  type RelationshipSnapshot,
} from "./relationship-engine";

export {
  pickVibe,
  getTodayVibe,
  getOrGenerateDailyVibe,
  getVibePromptContext,
  ALL_VIBES,
  type Vibe,
  type DailyVibeRecord,
} from "./vibe-engine";

export {
  getChemistryBand,
  getSurpriseMultiplier,
  getChemistryPromptContext,
  getChemistrySnapshot,
  type ChemistryBand,
  type ChemistrySnapshot,
} from "./chemistry-engine";

export {
  scoreMessage,
  maxRepetitionSimilarity,
  type QualityScore,
  type QualityCategory,
} from "./quality-engine";

export {
  computeHiddenProgress,
  type HiddenProgress,
} from "./progress-engine";

export {
  evaluateGesture,
  filterEligibleGestures,
  loadGesturesForPersona,
  loadCooldownMap,
  recordDelivery,
  type GestureType,
  type SurpriseGesture,
  type GestureDecision,
  type GestureDecisionInput,
} from "./gesture-engine";

export {
  getRelationshipStage,
  getStagePromptContext,
  buildBehaviorBrief,
  type RelationshipStage,
  type BehaviorBriefInput,
} from "./behavior-engine";

export {
  evaluateAntiGaming,
  type AntiGamingInput,
  type AntiGamingDecision,
  type RecentMessage,
} from "./anti-gaming-engine";
