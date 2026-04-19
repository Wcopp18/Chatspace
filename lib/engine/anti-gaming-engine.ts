/**
 * Anti-Gaming Engine
 *
 * Stops users from cracking the pattern or farming rewards with spam,
 * repetition, or fake effort. This engine runs *before* XP / chemistry /
 * gesture evaluation and emits a set of modifiers they all respect:
 *
 *   • xpMultiplier         — 0..1 applied to relationship XP awarded
 *   • gestureAllowed       — hard gate for the gesture engine
 *   • rewardMomentumDamp   — 0..1 applied to reward momentum
 *   • reasons              — why (for debugging / logs)
 *
 * Signals considered:
 *   - burst of messages in a short window
 *   - diminishing returns on near-duplicate messages
 *   - topic diversity (same n-gram cluster repeating)
 *   - very rapid post-reward follow-up
 *   - flagged-as-spam/demanding/mood-breaking from quality-engine
 */

import { maxRepetitionSimilarity } from "./quality-engine";
import type { QualityScore } from "./quality-engine";

export interface RecentMessage {
  content: string;
  createdAt: string | Date;
}

export interface AntiGamingInput {
  currentMessage: string;
  recentUserMessages: RecentMessage[];     // newest-first, last ~15
  quality: QualityScore;
  millisSinceLastReward: number | null;    // ms since any reward / gesture
  nowMs?: number;
}

export interface AntiGamingDecision {
  xpMultiplier: number;
  gestureAllowed: boolean;
  rewardMomentumDamp: number;
  reasons: string[];
  blocked: boolean;
}

// ── Helpers ──

function bursts(recent: RecentMessage[], nowMs: number, windowMs: number): number {
  let count = 0;
  for (const r of recent) {
    const ts = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
    if (nowMs - ts <= windowMs) count++;
    else break;
  }
  return count;
}

function topicDiversity(text: string, recent: RecentMessage[]): number {
  if (recent.length === 0) return 1;
  const recentTexts = recent.slice(0, 8).map(r => r.content);
  const sims = recentTexts.map(t => maxRepetitionSimilarity(text, [t]));
  const avg = sims.reduce((a, b) => a + b, 0) / sims.length;
  return 1 - avg;    // 1 = perfectly novel, 0 = identical to recent
}

// ── Main evaluator ──

export function evaluateAntiGaming(input: AntiGamingInput): AntiGamingDecision {
  const reasons: string[] = [];
  let xpMult = 1;
  let gestureAllowed = true;
  let momentumDamp = 1;

  const now = input.nowMs ?? Date.now();

  // 1) Quality-engine flags shortcut
  if (input.quality.flags.includes("spam") || input.quality.flags.includes("demanding") || input.quality.flags.includes("mood_break")) {
    xpMult = 0;
    gestureAllowed = false;
    momentumDamp = 0.2;
    reasons.push("quality_hard_flag");
  }

  // 2) Burst detection — 5+ messages in 10s = throttle, 8+ = hard block
  const burst10s = bursts(input.recentUserMessages, now, 10_000);
  if (burst10s >= 8) {
    xpMult = Math.min(xpMult, 0);
    gestureAllowed = false;
    momentumDamp = Math.min(momentumDamp, 0.1);
    reasons.push(`burst_hard_${burst10s}`);
  } else if (burst10s >= 5) {
    xpMult = Math.min(xpMult, 0.3);
    gestureAllowed = false;
    momentumDamp = Math.min(momentumDamp, 0.5);
    reasons.push(`burst_soft_${burst10s}`);
  }

  // 3) Diminishing returns for near-duplicates
  const repSim = input.quality.repetitionSimilarity;
  if (repSim > 0.85) {
    xpMult = Math.min(xpMult, 0.1);
    gestureAllowed = false;
    reasons.push("near_duplicate");
  } else if (repSim > 0.65) {
    xpMult = Math.min(xpMult, 0.5);
    momentumDamp = Math.min(momentumDamp, 0.7);
    reasons.push("repetitive");
  }

  // 4) Topic diversity — penalise when user keeps hitting the same topic with no variation
  const diversity = topicDiversity(input.currentMessage, input.recentUserMessages);
  if (diversity < 0.35) {
    xpMult = Math.min(xpMult, 0.6);
    momentumDamp = Math.min(momentumDamp, 0.75);
    reasons.push(`low_diversity_${diversity.toFixed(2)}`);
  }

  // 5) Rapid post-reward follow-up pressure
  if (input.millisSinceLastReward !== null && input.millisSinceLastReward < 45_000) {
    // Asking for more within 45s of a reward = suspicious
    if (/\b(more|another|again|send|show|give)\b/i.test(input.currentMessage)) {
      xpMult = Math.min(xpMult, 0.2);
      gestureAllowed = false;
      momentumDamp = Math.min(momentumDamp, 0.4);
      reasons.push("pushy_post_reward");
    }
  }

  // Clamp + round.
  xpMult = Math.max(0, Math.min(1, Math.round(xpMult * 100) / 100));
  momentumDamp = Math.max(0, Math.min(1, Math.round(momentumDamp * 100) / 100));

  return {
    xpMultiplier: xpMult,
    gestureAllowed,
    rewardMomentumDamp: momentumDamp,
    reasons,
    blocked: xpMult === 0 && !gestureAllowed,
  };
}
