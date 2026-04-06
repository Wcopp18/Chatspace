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
  calculateTensionDelta,
  analyzeFlirtIntensity,
  calculateCooldownDrop,
  calculateRevealProbability,
  updateTension,
  getOrCreateTensionState,
  type TensionUpdateResult,
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
