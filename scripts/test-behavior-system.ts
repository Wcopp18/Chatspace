/**
 * Acceptance test for System 7 — Behavior Adaptation.
 *
 * Verifies:
 *   1. Relationship stage bands are correctly assigned from level/total
 *   2. Stage prompts are distinct and mention the stage name
 *   3. Behavior brief composes stage + vibe + chemistry lines
 *   4. Recently-delivered flag adds a "don't rush another gift" line
 *   5. Long absence flag adds a "pick the thread up" line
 *   6. Differently-parameterised briefs produce different text
 */

import {
  getRelationshipStage,
  getStagePromptContext,
  buildBehaviorBrief,
} from "../lib/engine/behavior-engine";

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(c: boolean, label: string, detail?: string) {
  if (c) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`); }
}

function test() {
  console.log("\n[1] Stage bands");
  assert(getRelationshipStage(1, 6) === "early", "lvl 1/6 → early");
  assert(getRelationshipStage(2, 6) === "warming", "lvl 2/6 → warming");
  assert(getRelationshipStage(4, 6) === "close", "lvl 4/6 → close");
  assert(getRelationshipStage(5, 6) === "deep", "lvl 5/6 → deep");
  assert(getRelationshipStage(6, 6) === "devoted", "lvl 6/6 → devoted");

  console.log("\n[2] Stage prompt contexts are distinct");
  const early = getStagePromptContext("early");
  const devoted = getStagePromptContext("devoted");
  assert(early !== devoted, "early vs devoted differ");
  assert(early.includes("EARLY"), "early prompt mentions stage");
  assert(devoted.includes("DEVOTED"), "devoted prompt mentions stage");
  assert(early.includes("INVISIBLE TO USER"), "early marked invisible");
  assert(devoted.includes("INVISIBLE TO USER"), "devoted marked invisible");

  console.log("\n[3] Behavior brief composes all three lines");
  const brief = buildBehaviorBrief({
    relationshipLevelNumber: 4,
    totalLevels: 6,
    vibe: "clingy",
    vibeIntensity: 0.7,
    chemistryBand: "hot",
    recentlyDelivered: false,
    longAbsence: false,
  });
  assert(brief.includes("RELATIONSHIP STAGE"), "includes stage section");
  assert(brief.includes("DAILY MOOD"), "includes mood section");
  assert(brief.includes("TONIGHT'S CHEMISTRY"), "includes chemistry section");
  assert(brief.includes("CLINGY"), "clingy vibe surfaced");

  console.log("\n[4] Recently-delivered appends 'don't rush' recency note");
  const withRecent = buildBehaviorBrief({
    relationshipLevelNumber: 4,
    totalLevels: 6,
    vibe: "playful",
    vibeIntensity: 0.5,
    chemistryBand: "good",
    recentlyDelivered: true,
    longAbsence: false,
  });
  assert(withRecent.includes("Don't rush"), "don't rush line present");

  console.log("\n[5] Long absence appends 'pick the thread' recency note");
  const withAbsence = buildBehaviorBrief({
    relationshipLevelNumber: 4,
    totalLevels: 6,
    vibe: "calm",
    vibeIntensity: 0.5,
    chemistryBand: "warm",
    recentlyDelivered: false,
    longAbsence: true,
  });
  assert(withAbsence.includes("gone a few days"), "absence line present");

  console.log("\n[6] Different inputs → different outputs");
  const a = buildBehaviorBrief({
    relationshipLevelNumber: 1, totalLevels: 6, vibe: "playful",
    vibeIntensity: 0.5, chemistryBand: "flat",
    recentlyDelivered: false, longAbsence: false,
  });
  const b = buildBehaviorBrief({
    relationshipLevelNumber: 6, totalLevels: 6, vibe: "vulnerable",
    vibeIntensity: 0.9, chemistryBand: "electric",
    recentlyDelivered: false, longAbsence: false,
  });
  assert(a !== b, "vastly different inputs produce different briefs");
  assert(!a.includes("DEVOTED"), "early brief does not mention devoted");
  assert(b.includes("DEVOTED"), "late brief mentions devoted");
}

console.log("═══ Behavior Adaptation — Acceptance Tests ═══");
test();
console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
if (failed > 0) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
