/**
 * Acceptance test for System 3 — Session Chemistry.
 *
 * Verifies:
 *   1. Band mapping is correct across score ranges
 *   2. Surprise multipliers follow the band order
 *   3. Tension engine's score delta moves chemistry in the expected direction
 *   4. Session timeout causes chemistry to reset (via existing engine)
 *   5. Prompt hints are distinct for each band and marked invisible
 */

import {
  getChemistryBand,
  getSurpriseMultiplier,
  getChemistryPromptContext,
} from "../lib/engine/chemistry-engine";
import {
  analyzeMessage,
  calculateVisibleDelta,
  isSessionExpired,
} from "../lib/engine/tension-engine";

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(c: boolean, label: string, detail?: string) {
  if (c) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`); }
}

function testBandMapping() {
  console.log("\n[1] Band thresholds");
  assert(getChemistryBand(10) === "flat", "10 → flat");
  assert(getChemistryBand(30) === "warm", "30 → warm");
  assert(getChemistryBand(50) === "good", "50 → good");
  assert(getChemistryBand(70) === "hot", "70 → hot");
  assert(getChemistryBand(90) === "electric", "90 → electric");
}

function testMultiplierOrdering() {
  console.log("\n[2] Surprise multipliers scale with band");
  const flat = getSurpriseMultiplier("flat");
  const warm = getSurpriseMultiplier("warm");
  const good = getSurpriseMultiplier("good");
  const hot = getSurpriseMultiplier("hot");
  const electric = getSurpriseMultiplier("electric");
  assert(flat < warm && warm < good && good < hot && hot < electric,
    "monotonic increase",
    `${flat} < ${warm} < ${good} < ${hot} < ${electric}`);
  assert(electric === 1.5, "electric caps at 1.5");
}

function testDeltaDrivesChemistry() {
  console.log("\n[3] Good messages raise chemistry, bad messages lower it");
  const flirt = analyzeMessage("thinking about you all day beautiful, can't get you out of my head");
  const { delta: deltaFlirt } = calculateVisibleDelta({
    ...flirt, responseSpeedSeconds: 30, justUnlockedReward: false,
  });
  assert(deltaFlirt > 2, "flirty+engaged delta strongly positive", `got ${deltaFlirt}`);

  const spam = analyzeMessage("send pics");
  const { delta: deltaSpam } = calculateVisibleDelta({
    ...spam, responseSpeedSeconds: 5, justUnlockedReward: false,
  });
  assert(deltaSpam < 0, "demanding message delta negative", `got ${deltaSpam}`);

  const moodBreak = analyzeMessage("you're boring");
  const { delta: deltaBreak } = calculateVisibleDelta({
    ...moodBreak, responseSpeedSeconds: 5, justUnlockedReward: false,
  });
  assert(deltaBreak < 0, "mood-breaking delta negative", `got ${deltaBreak}`);
}

function testSessionTimeout() {
  console.log("\n[4] Session timeout detection");
  const fresh = new Date(Date.now() - 60_000).toISOString();  // 1 minute ago
  const old = new Date(Date.now() - 60 * 60_000).toISOString(); // 60 minutes ago
  assert(!isSessionExpired(fresh), "1-minute-old session is fresh");
  assert(isSessionExpired(old), "60-minute-old session is expired");
  assert(isSessionExpired(null), "null session treated as expired (fresh visit)");
}

function testPromptHints() {
  console.log("\n[5] Prompt hints are distinct and invisible-flagged");
  const flatHint = getChemistryPromptContext("flat");
  const electricHint = getChemistryPromptContext("electric");
  assert(flatHint !== electricHint, "flat and electric hints differ");
  assert(flatHint.includes("INVISIBLE TO USER"), "flat hint marked invisible");
  assert(electricHint.includes("INVISIBLE TO USER"), "electric hint marked invisible");
  assert(electricHint.toLowerCase().includes("fire") || electricHint.toLowerCase().includes("locked in"),
    "electric hint has electric energy");
  assert(flatHint.toLowerCase().includes("pull back") || flatHint.toLowerCase().includes("less warm"),
    "flat hint pulls back");
}

async function main() {
  console.log("═══ Session Chemistry System — Acceptance Tests ═══");
  testBandMapping();
  testMultiplierOrdering();
  testDeltaDrivesChemistry();
  testSessionTimeout();
  testPromptHints();
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failed > 0) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
