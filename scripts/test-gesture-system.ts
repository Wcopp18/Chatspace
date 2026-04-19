/**
 * Acceptance test for System 6 — Surprise Gesture.
 *
 * Verifies:
 *   1. Low-quality message never delivers
 *   2. No eligible gestures returns no delivery
 *   3. Relationship level gates are enforced
 *   4. Chemistry band floor is enforced
 *   5. Vibe tags filter correctly
 *   6. Cooldown prevents re-delivery of the same gesture
 *   7. Higher boost increases delivery rate over many rolls
 *   8. Vibe-matched gesture is preferred in weighted pick
 */

import {
  evaluateGesture,
  filterEligibleGestures,
  type SurpriseGesture,
  type GestureDecisionInput,
} from "../lib/engine/gesture-engine";

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(c: boolean, label: string, detail?: string) {
  if (c) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`); }
}

function makeGesture(overrides: Partial<SurpriseGesture> = {}): SurpriseGesture {
  return {
    id: Math.random().toString(36).slice(2, 10),
    persona_id: "p",
    gesture_type: "note",
    content_text: "thinking about you",
    media_url: null,
    thumbnail_url: null,
    caption: null,
    min_relationship_level: 1,
    min_chemistry_band: "warm",
    vibe_tags: [],
    cooldown_hours: 12,
    weight: 1,
    is_active: true,
    ...overrides,
  };
}

function mulberry(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const baseInput: GestureDecisionInput = {
  hiddenProgressBoost: 0.8,
  chemistryBand: "hot",
  chemistryMultiplier: 1.2,
  relationshipLevel: 3,
  vibe: "affectionate",
  qualityCategory: "high",
};

function test() {
  console.log("\n[1] Low-quality message never delivers");
  const gestures = [makeGesture()];
  const r1 = evaluateGesture(gestures, { ...baseInput, qualityCategory: "low" }, {});
  assert(!r1.shouldDeliver, "no delivery on low quality");
  assert(r1.reason === "low_quality_message", "reason marked");

  console.log("\n[2] No eligible gestures returns no delivery");
  const r2 = evaluateGesture([], baseInput, {});
  assert(!r2.shouldDeliver, "no delivery when empty");
  assert(r2.reason === "no_eligible_gestures", "reason marked");

  console.log("\n[3] Relationship level gate enforced");
  const highLevelGesture = [makeGesture({ min_relationship_level: 5 })];
  const elig = filterEligibleGestures(highLevelGesture, baseInput, {});
  assert(elig.length === 0, "level-5 gesture excluded at level 3");

  const lvl5Input = { ...baseInput, relationshipLevel: 5 };
  const elig2 = filterEligibleGestures(highLevelGesture, lvl5Input, {});
  assert(elig2.length === 1, "level-5 gesture included at level 5");

  console.log("\n[4] Chemistry band floor enforced");
  const hotOnly = [makeGesture({ min_chemistry_band: "hot" })];
  const eligWarm = filterEligibleGestures(hotOnly, { ...baseInput, chemistryBand: "warm" }, {});
  const eligHot = filterEligibleGestures(hotOnly, { ...baseInput, chemistryBand: "hot" }, {});
  assert(eligWarm.length === 0, "hot-only excluded in warm");
  assert(eligHot.length === 1, "hot-only included in hot");

  console.log("\n[5] Vibe tags filter correctly");
  const clingyOnly = [makeGesture({ vibe_tags: ["clingy"] })];
  const eligClingy = filterEligibleGestures(clingyOnly, { ...baseInput, vibe: "clingy" }, {});
  const eligPlayful = filterEligibleGestures(clingyOnly, { ...baseInput, vibe: "playful" }, {});
  assert(eligClingy.length === 1, "clingy-tag fits clingy vibe");
  assert(eligPlayful.length === 0, "clingy-tag excluded on playful vibe");

  console.log("\n[6] Cooldown prevents re-delivery");
  const g = makeGesture({ cooldown_hours: 24 });
  const recent = { [g.id]: 60 * 60_000 };  // 1h ago, cooldown 24h
  const eligRecent = filterEligibleGestures([g], baseInput, recent);
  assert(eligRecent.length === 0, "recent delivery blocked");
  const stale = { [g.id]: 48 * 60 * 60_000 };   // 48h ago
  const eligStale = filterEligibleGestures([g], baseInput, stale);
  assert(eligStale.length === 1, "48h-old delivery eligible");

  console.log("\n[7] Higher boost increases delivery rate");
  let lowDeliveries = 0, highDeliveries = 0;
  for (let i = 0; i < 200; i++) {
    const rng = mulberry(i);
    const low = evaluateGesture([makeGesture()], { ...baseInput, hiddenProgressBoost: 0.2, random: rng }, {});
    const high = evaluateGesture([makeGesture()], { ...baseInput, hiddenProgressBoost: 0.9, random: mulberry(i) }, {});
    if (low.shouldDeliver) lowDeliveries++;
    if (high.shouldDeliver) highDeliveries++;
  }
  assert(highDeliveries > lowDeliveries, "high boost wins more often", `low=${lowDeliveries} high=${highDeliveries}`);

  console.log("\n[8] Vibe-matched gesture is preferred in weighted pick");
  let matchWins = 0, untagWins = 0;
  const tagged = makeGesture({ id: "tagged", vibe_tags: ["clingy"], weight: 1 });
  const untagged = makeGesture({ id: "untagged", weight: 1 });
  for (let i = 0; i < 400; i++) {
    const rng = mulberry(i);
    const d = evaluateGesture([tagged, untagged], { ...baseInput, vibe: "clingy", hiddenProgressBoost: 0.95, random: rng }, {});
    if (d.shouldDeliver && d.selectedGesture?.id === "tagged") matchWins++;
    if (d.shouldDeliver && d.selectedGesture?.id === "untagged") untagWins++;
  }
  assert(matchWins > untagWins, "tag-matched gesture preferred over untagged", `tagged=${matchWins} untagged=${untagWins}`);
}

console.log("═══ Surprise Gesture System — Acceptance Tests ═══");
test();
console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
if (failed > 0) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
