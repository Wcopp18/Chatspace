/**
 * Acceptance test for System 8 — Anti-Gaming.
 *
 * Verifies:
 *   1. Normal message passes through (xpMult=1, gestures allowed)
 *   2. Spam flag zeroes XP and blocks gestures
 *   3. Rapid burst (5+ in 10s) throttles; 8+ hard-blocks
 *   4. Near-duplicate messages almost zero XP
 *   5. Low topic diversity dampens multiplier
 *   6. "send more" right after a reward gets pushy_post_reward flag
 *   7. All returned values stay in [0,1]
 */

import { evaluateAntiGaming } from "../lib/engine/anti-gaming-engine";
import { scoreMessage } from "../lib/engine/quality-engine";

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(c: boolean, label: string, detail?: string) {
  if (c) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`); }
}

function msgs(texts: string[], startOffsetMs = 0, spacingMs = 60_000) {
  return texts.map((t, i) => ({ content: t, createdAt: new Date(Date.now() - startOffsetMs - i * spacingMs).toISOString() }));
}

function test() {
  console.log("\n[1] Normal message — pass-through");
  const q1 = scoreMessage("hey gorgeous, how was your day? i was thinking about you");
  const r1 = evaluateAntiGaming({
    currentMessage: "hey gorgeous, how was your day? i was thinking about you",
    recentUserMessages: [],
    quality: q1,
    millisSinceLastReward: null,
  });
  assert(r1.xpMultiplier === 1, "xpMult = 1", `got ${r1.xpMultiplier}`);
  assert(r1.gestureAllowed, "gestures allowed");
  assert(r1.reasons.length === 0, "no anti-gaming reasons", `got ${r1.reasons.join(",")}`);

  console.log("\n[2] Spam / demanding flag");
  const q2 = scoreMessage("send nudes");
  const r2 = evaluateAntiGaming({
    currentMessage: "send nudes",
    recentUserMessages: [],
    quality: q2,
    millisSinceLastReward: null,
  });
  assert(r2.xpMultiplier === 0, "spam zeroes XP", `got ${r2.xpMultiplier}`);
  assert(!r2.gestureAllowed, "spam blocks gestures");
  assert(r2.reasons.includes("quality_hard_flag"), "reason recorded");

  console.log("\n[3] Burst detection");
  const burstText = "hey";
  const burstMsgs = msgs(Array(7).fill(burstText), 0, 1000); // 7 msgs, 1s apart, all within 7s
  const q3 = scoreMessage(burstText);
  const rBurstSoft = evaluateAntiGaming({
    currentMessage: burstText,
    recentUserMessages: burstMsgs,
    quality: q3,
    millisSinceLastReward: null,
  });
  assert(rBurstSoft.reasons.some(r => r.startsWith("burst_")), "burst detected", `reasons=${rBurstSoft.reasons.join(",")}`);
  assert(!rBurstSoft.gestureAllowed, "burst blocks gestures");

  const hardBurstMsgs = msgs(Array(10).fill("a"), 0, 500); // 10 in 5s
  const rBurstHard = evaluateAntiGaming({
    currentMessage: "a",
    recentUserMessages: hardBurstMsgs,
    quality: scoreMessage("a"),
    millisSinceLastReward: null,
  });
  assert(rBurstHard.xpMultiplier === 0, "hard burst zeros xp");
  assert(rBurstHard.reasons.some(r => r.startsWith("burst_hard_")), "hard burst reason");

  console.log("\n[4] Near-duplicate messages");
  const dup = "hey beautiful how was your day today";
  const history = [dup, dup, dup];
  const q4 = scoreMessage(dup, history);
  const r4 = evaluateAntiGaming({
    currentMessage: dup,
    recentUserMessages: msgs(history, 60_000, 60_000),
    quality: q4,
    millisSinceLastReward: null,
  });
  assert(r4.xpMultiplier <= 0.1, "near-dup kills XP", `got ${r4.xpMultiplier}`);
  assert(r4.reasons.includes("near_duplicate"), "near_duplicate reason");

  console.log("\n[5] Low topic diversity (heavily repeated wording)");
  // Realistic farming: user asks the same thing five different ways.
  const sameTopic = [
    "how was your day today beautiful",
    "how was your day beautiful",
    "how is your day beautiful",
    "how was your day",
    "how was your day today",
  ];
  const current = "how was your day today gorgeous";
  const q5 = scoreMessage(current, sameTopic);
  const r5 = evaluateAntiGaming({
    currentMessage: current,
    recentUserMessages: msgs(sameTopic, 60_000, 60_000),
    quality: q5,
    millisSinceLastReward: null,
  });
  assert(r5.reasons.some(r => r.startsWith("low_diversity")) || r5.reasons.includes("repetitive") || r5.reasons.includes("near_duplicate"),
    "low diversity / repetitive detected", `reasons=${r5.reasons.join(",")}`);
  assert(r5.xpMultiplier < 1, "XP dampened for low diversity");

  console.log("\n[6] Pushy post-reward");
  const q6 = scoreMessage("send more please");
  const r6 = evaluateAntiGaming({
    currentMessage: "send more please",
    recentUserMessages: [],
    quality: q6,
    millisSinceLastReward: 10_000, // 10s ago
  });
  assert(r6.reasons.includes("pushy_post_reward") || r6.reasons.includes("quality_hard_flag"),
    "pushy flag raised", `reasons=${r6.reasons.join(",")}`);
  assert(!r6.gestureAllowed, "post-reward pushy blocks gesture");

  console.log("\n[7] Values stay in bounds");
  for (let i = 0; i < 50; i++) {
    const q = scoreMessage("whatever");
    const r = evaluateAntiGaming({
      currentMessage: "whatever",
      recentUserMessages: [],
      quality: q,
      millisSinceLastReward: null,
    });
    if (r.xpMultiplier < 0 || r.xpMultiplier > 1) { assert(false, "xpMult out of bounds"); return; }
    if (r.rewardMomentumDamp < 0 || r.rewardMomentumDamp > 1) { assert(false, "damp out of bounds"); return; }
  }
  assert(true, "all 50 iterations in [0,1]");
}

console.log("═══ Anti-Gaming System — Acceptance Tests ═══");
test();
console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
if (failed > 0) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
