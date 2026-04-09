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
