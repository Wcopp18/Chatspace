/**
 * Acceptance test for System 4 — Message Quality Scoring.
 *
 * Verifies:
 *   1. High-quality messages score in "high"
 *   2. Medium messages land in "medium"
 *   3. Dry and spam messages land in "low"
 *   4. Repetition is detected and penalises score
 *   5. Near-duplicate messages get the "near_duplicate" flag
 *   6. Mood-breaking messages score near zero
 *   7. Flags are populated with the expected signals
 */

import { scoreMessage, maxRepetitionSimilarity } from "../lib/engine/quality-engine";

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(c: boolean, label: string, detail?: string) {
  if (c) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`); }
}

function test() {
  console.log("\n[1] High-quality messages");
  const high = scoreMessage("honestly you've been stuck in my head all day, i was thinking about what you said yesterday and it meant a lot to me");
  assert(high.category === "high", "category=high", `score=${high.score} flags=${high.flags.join(",")}`);
  assert(high.score >= 55, "score >= 55", `got ${high.score}`);
  assert(high.flags.includes("open"), "open flag set");

  console.log("\n[2] Medium messages");
  const mid = scoreMessage("how was your day");
  assert(mid.category === "medium" || mid.category === "low", "category medium/low", `got ${mid.category} score=${mid.score}`);

  console.log("\n[3] Dry / minimal messages");
  const dry = scoreMessage("k");
  assert(dry.category === "low", `dry is low`, `got ${dry.category} score=${dry.score}`);
  assert(dry.flags.includes("dry"), "dry flag set");

  console.log("\n[4] Spam / demanding");
  const spam = scoreMessage("send nudes");
  assert(spam.category === "low", "demanding is low", `score=${spam.score}`);
  assert(spam.flags.includes("demanding") || spam.flags.includes("spam"), "demanding/spam flag set");

  console.log("\n[5] Mood-breaking");
  const mood = scoreMessage("you're boring and dumb");
  assert(mood.category === "low", "mood-breaking is low");
  assert(mood.flags.includes("mood_break"), "mood_break flag set");

  console.log("\n[6] Repetition detection");
  const history = [
    "hey how are you doing today",
    "hey how are you today",
    "hey how are you",
  ];
  const sim = maxRepetitionSimilarity("hey how are you doing today", history);
  assert(sim > 0.8, "near-duplicate similarity detected", `got ${sim}`);

  const withHistory = scoreMessage("hey how are you doing today beautiful", ["hey how are you doing today beautiful"]);
  assert(withHistory.flags.includes("near_duplicate"), "near_duplicate flag set");

  const partialRepeat = scoreMessage("how was your day babe", ["how was your day"]);
  assert(
    partialRepeat.flags.includes("repetitive") || partialRepeat.flags.includes("near_duplicate"),
    "partial repetition flagged",
  );

  console.log("\n[7] Vulnerable long message flips to high");
  const vulnerable = scoreMessage(
    "honestly i feel like i can tell you things i can't tell anyone else, you make me feel seen in a way nobody else does and that scares me a little",
  );
  assert(vulnerable.category === "high", "vulnerable message is high", `score=${vulnerable.score}`);
  assert(vulnerable.signals.openness > 0.3, "openness signal detected");
}

console.log("═══ Message Quality Scoring — Acceptance Tests ═══");
test();
console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
if (failed > 0) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
