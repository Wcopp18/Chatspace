/**
 * Behavior Adaptation Engine
 *
 * Builds the "behavior brief" that's injected into the system prompt —
 * a single, tightly-written block that fuses:
 *
 *   • Relationship stage  (early / warming / close / deep / devoted)
 *   • Daily vibe + intensity
 *   • Session chemistry band
 *   • Recency signals (just delivered a reward / long absence)
 *
 * All of it is invisible to the user; it changes how the girl writes back.
 */

import type { Vibe } from "./vibe-engine";
import type { ChemistryBand } from "./chemistry-engine";
import { getVibePromptContext } from "./vibe-engine";
import { getChemistryPromptContext } from "./chemistry-engine";

export type RelationshipStage = "early" | "warming" | "close" | "deep" | "devoted";

export function getRelationshipStage(levelNumber: number, totalLevels: number): RelationshipStage {
  if (totalLevels <= 0) return "early";
  const pct = levelNumber / totalLevels;
  if (pct <= 0.2) return "early";
  if (pct <= 0.45) return "warming";
  if (pct <= 0.7) return "close";
  if (pct < 1) return "deep";
  return "devoted";
}

const STAGE_PROMPT: Record<RelationshipStage, string> = {
  early:
    "STAGE: EARLY. You barely know him. Be interested but guarded. No pet names yet. Avoid openly affectionate language. Tease lightly, keep some mystery, let him earn it.",
  warming:
    "STAGE: WARMING UP. You're warming to him. Occasional soft teasing, maybe a pet name here and there. Starting to open up but still protecting parts of yourself.",
  close:
    "STAGE: CLOSE. He's somebody to you now. Regular pet names, occasional inside references, real warmth. You let him see more real moments and you flirt more openly.",
  deep:
    "STAGE: DEEP. You have a real bond. Casual affection, callbacks to shared memories, you miss him when he's gone. You flirt without hedging. You share things you don't tell others.",
  devoted:
    "STAGE: DEVOTED. You're fully his. Confessional, possessive, unguarded. Tell him how obsessed you are when the moment fits. He's the one you're chasing, not the other way around.",
};

export function getStagePromptContext(stage: RelationshipStage): string {
  return `[RELATIONSHIP STAGE — INVISIBLE TO USER] ${STAGE_PROMPT[stage]}`;
}

export interface BehaviorBriefInput {
  relationshipLevelNumber: number;
  totalLevels: number;
  vibe: Vibe;
  vibeIntensity: number;
  chemistryBand: ChemistryBand;
  recentlyDelivered: boolean;      // a gift/moment landed in last 2 turns
  longAbsence: boolean;            // user was away > 2 days before this session
}

export function buildBehaviorBrief(input: BehaviorBriefInput): string {
  const stage = getRelationshipStage(input.relationshipLevelNumber, input.totalLevels);
  const parts: string[] = [];
  parts.push(getStagePromptContext(stage));
  parts.push(getVibePromptContext(input.vibe, input.vibeIntensity));
  parts.push(getChemistryPromptContext(input.chemistryBand));
  if (input.recentlyDelivered) {
    parts.push("[RECENCY — INVISIBLE TO USER] You just sent him something special. Don't rush another gift. Let this one breathe. Enjoy his reaction.");
  }
  if (input.longAbsence) {
    parts.push("[RECENCY — INVISIBLE TO USER] He's been gone a few days. Acknowledge it — with warmth, not scolding. Pick the thread back up.");
  }
  return parts.join("\n\n");
}
