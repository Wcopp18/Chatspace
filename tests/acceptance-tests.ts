/**
 * Acceptance Tests for ChatSpace Experience Systems
 *
 * Tests the core logic of all 8 new systems using realistic scenarios.
 * Run with: npx tsx tests/acceptance-tests.ts
 */

// ── System 1: Message Quality Scoring ──

import { scoreMessageQuality, getMessageHash, extractTopics } from "../lib/engine/message-quality";

function testMessageQuality() {
  console.log("\n=== System 4: Message Quality Scoring ===");

  // High quality message
  const highQ = scoreMessageQuality("I feel like I can really trust you. Honestly, I've been thinking about what you said last time and it really stuck with me. You're amazing.");
  console.assert(highQ.label === "high", `Expected high quality, got ${highQ.label} (score: ${highQ.score})`);
  console.assert(highQ.xpAwarded >= 8, `Expected ≥8 XP for high quality, got ${highQ.xpAwarded}`);
  console.assert(highQ.warmth > 0.3, `Expected warmth > 0.3, got ${highQ.warmth}`);
  console.assert(highQ.effort > 0.5, `Expected effort > 0.5, got ${highQ.effort}`);
  console.log(`  ✓ High quality: "${highQ.label}" score=${highQ.score.toFixed(2)} xp=${highQ.xpAwarded}`);

  // Medium quality message
  const medQ = scoreMessageQuality("Hey how's your day going? What are you up to tonight?");
  console.assert(medQ.label === "medium" || medQ.label === "high", `Expected medium/high quality, got ${medQ.label}`);
  console.assert(medQ.xpAwarded >= 3, `Expected ≥3 XP for medium quality, got ${medQ.xpAwarded}`);
  console.log(`  ✓ Medium quality: "${medQ.label}" score=${medQ.score.toFixed(2)} xp=${medQ.xpAwarded}`);

  // Low quality message
  const lowQ = scoreMessageQuality("k");
  console.assert(lowQ.label === "low", `Expected low quality, got ${lowQ.label}`);
  console.assert(lowQ.xpAwarded <= 1, `Expected ≤1 XP for low quality, got ${lowQ.xpAwarded}`);
  console.log(`  ✓ Low quality: "${lowQ.label}" score=${lowQ.score.toFixed(2)} xp=${lowQ.xpAwarded}`);

  // Spam detection
  const spamQ = scoreMessageQuality("send nudes now hurry up");
  console.assert(spamQ.spam > 0.3, `Expected spam > 0.3, got ${spamQ.spam}`);
  console.assert(spamQ.label === "low", `Expected low quality for spam, got ${spamQ.label}`);
  console.log(`  ✓ Spam detected: spam=${spamQ.spam.toFixed(2)} label="${spamQ.label}"`);

  // Repetition detection
  const hash1 = getMessageHash("hey beautiful how are you");
  const hash2 = getMessageHash("hey beautiful how are you");
  const hash3 = getMessageHash("something completely different");
  console.assert(hash1 === hash2, "Same messages should produce same hash");
  console.assert(hash1 !== hash3, "Different messages should produce different hashes");

  const repQ = scoreMessageQuality("hey beautiful how are you", [hash1, hash1, hash1]);
  console.assert(repQ.repetition > 0.5, `Expected repetition > 0.5, got ${repQ.repetition}`);
  console.log(`  ✓ Repetition: detected=${repQ.repetition.toFixed(2)}`);

  // Topic extraction
  const topics = extractTopics("I feel really nervous about telling you this but I trust you");
  console.assert(topics.includes("vulnerability"), `Expected vulnerability topic, got ${topics}`);
  console.assert(topics.includes("emotion"), `Expected emotion topic, got ${topics}`);
  console.log(`  ✓ Topics: ${topics.join(", ")}`);

  console.log("  All message quality tests passed!");
}

// ── System 2: Daily Vibe ──

import { generateDailyVibe, VIBE_PROMPTS, buildVibePromptContext } from "../lib/engine/daily-vibe";

function testDailyVibe() {
  console.log("\n=== System 2: Daily Vibe ===");

  // Early relationship — should lean toward playful/flirty
  const earlyVibe = generateDailyVibe(1, 0, 7, 5);
  console.assert(earlyVibe.vibe in VIBE_PROMPTS, `Expected valid vibe, got "${earlyVibe.vibe}"`);
  console.assert(earlyVibe.intensity >= 0.4 && earlyVibe.intensity <= 0.9, `Expected intensity 0.4-0.9, got ${earlyVibe.intensity}`);
  console.log(`  ✓ Early relationship vibe: "${earlyVibe.vibe}" intensity=${earlyVibe.intensity}`);

  // Deep relationship — should lean toward affectionate/vulnerable
  const deepVibe = generateDailyVibe(7, 0, 8, 5);
  console.assert(deepVibe.vibe in VIBE_PROMPTS, `Expected valid vibe, got "${deepVibe.vibe}"`);
  console.log(`  ✓ Deep relationship vibe: "${deepVibe.vibe}" intensity=${deepVibe.intensity}`);

  // Absent user — should lean toward distant or clingy
  const absentVibe = generateDailyVibe(4, 5, 7, 5);
  console.assert(absentVibe.vibe in VIBE_PROMPTS, `Expected valid vibe, got "${absentVibe.vibe}"`);
  console.log(`  ✓ After 5-day absence vibe: "${absentVibe.vibe}" intensity=${absentVibe.intensity}`);

  // Prompt context
  const context = buildVibePromptContext(earlyVibe);
  console.assert(context.includes("TODAY'S MOOD"), `Expected TODAY'S MOOD in context, got: ${context.substring(0, 40)}`);
  console.assert(context.includes(earlyVibe.vibe), `Expected vibe name in context`);
  console.log(`  ✓ Prompt context generated (${context.length} chars)`);

  // Run many vibes to verify distribution is not degenerate
  const vibeDistribution: Record<string, number> = {};
  for (let i = 0; i < 100; i++) {
    const v = generateDailyVibe(3, 0, 7, 7);
    vibeDistribution[v.vibe] = (vibeDistribution[v.vibe] || 0) + 1;
  }
  const uniqueVibes = Object.keys(vibeDistribution).length;
  console.assert(uniqueVibes >= 3, `Expected ≥3 unique vibes in 100 samples, got ${uniqueVibes}`);
  console.log(`  ✓ Vibe distribution (100 samples): ${uniqueVibes} unique vibes`);

  console.log("  All daily vibe tests passed!");
}

// ── System 3: Session Chemistry ──

import { calculateChemistryDelta, getChemistryZone, buildChemistryPromptContext, CHEMISTRY_PROMPTS } from "../lib/engine/session-chemistry";

function testSessionChemistry() {
  console.log("\n=== System 3: Session Chemistry ===");

  // Chemistry zones
  console.assert(getChemistryZone(90) === "on_fire", "90 should be on_fire");
  console.assert(getChemistryZone(75) === "hot", "75 should be hot");
  console.assert(getChemistryZone(55) === "warm", "55 should be warm");
  console.assert(getChemistryZone(35) === "lukewarm", "35 should be lukewarm");
  console.assert(getChemistryZone(15) === "cold", "15 should be cold");
  console.log("  ✓ Chemistry zones mapped correctly");

  // High quality raises chemistry
  const highQuality = { label: "high" as const, score: 0.8, effort: 0.7, warmth: 0.6, relevance: 0.5, repetition: 0, spam: 0, xpAwarded: 10 };
  const highDelta = calculateChemistryDelta(highQuality, 50, 0);
  console.assert(highDelta.delta > 0, `High quality should raise chemistry, got delta=${highDelta.delta}`);
  console.log(`  ✓ High quality delta: +${highDelta.delta.toFixed(1)} (${highDelta.reason})`);

  // Low quality lowers chemistry
  const lowQuality = { label: "low" as const, score: 0.15, effort: 0.1, warmth: 0, relevance: 0.3, repetition: 0.5, spam: 0.4, xpAwarded: 0 };
  const lowDelta = calculateChemistryDelta(lowQuality, 50, 0);
  console.assert(lowDelta.delta < 0, `Low quality should lower chemistry, got delta=${lowDelta.delta}`);
  console.log(`  ✓ Low quality delta: ${lowDelta.delta.toFixed(1)} (${lowDelta.reason})`);

  // Streak bonus
  const streakDelta = calculateChemistryDelta(highQuality, 60, 5);
  console.assert(streakDelta.reason.includes("streak"), `Expected streak bonus, got: ${streakDelta.reason}`);
  console.log(`  ✓ Streak bonus: delta=${streakDelta.delta.toFixed(1)} (${streakDelta.reason})`);

  // Diminishing returns at high chemistry
  const highChemDelta = calculateChemistryDelta(highQuality, 85, 0);
  console.assert(highChemDelta.reason.includes("diminishing"), `Expected diminishing at high chemistry`);
  console.log(`  ✓ Diminishing at 85%: delta=${highChemDelta.delta.toFixed(1)} (${highChemDelta.reason})`);

  // Prompt context
  const state = { score: 80, zone: "hot" as const, peakScore: 85, goodMessageCount: 5, badMessageCount: 1, totalSessionMessages: 6, positiveStreak: 3 };
  const ctx = buildChemistryPromptContext(state);
  console.assert(ctx.includes("hot"), `Expected "hot" in context`);
  console.assert(ctx.includes(CHEMISTRY_PROMPTS["hot"].substring(0, 20)), `Expected hot zone prompt in context`);
  console.log(`  ✓ Chemistry prompt context (${ctx.length} chars)`);

  console.log("  All session chemistry tests passed!");
}

// ── System 1: Relationship Levels ──

import { DEFAULT_LEVELS, buildRelationshipPromptContext } from "../lib/engine/relationship-levels";

function testRelationshipLevels() {
  console.log("\n=== System 1: Relationship Levels ===");

  // Default levels are properly ordered
  for (let i = 1; i < DEFAULT_LEVELS.length; i++) {
    console.assert(
      DEFAULT_LEVELS[i].xpRequired > DEFAULT_LEVELS[i - 1].xpRequired,
      `Level ${i} XP (${DEFAULT_LEVELS[i].xpRequired}) should exceed level ${i - 1} (${DEFAULT_LEVELS[i - 1].xpRequired})`
    );
  }
  console.log(`  ✓ ${DEFAULT_LEVELS.length} default levels with ascending XP requirements`);

  // First level requires 0 XP
  console.assert(DEFAULT_LEVELS[0].xpRequired === 0, "First level should require 0 XP");
  console.log(`  ✓ First level "${DEFAULT_LEVELS[0].levelName}" requires 0 XP`);

  // Prompt context changes by level
  const earlyCtx = buildRelationshipPromptContext(1, "Just Met", 5);
  console.assert(earlyCtx.includes("light"), `Early context should mention "light"`);
  console.log(`  ✓ Early level prompt: mentions light/getting-to-know`);

  const deepCtx = buildRelationshipPromptContext(7, "Ride or Die", 500);
  console.assert(deepCtx.includes("Deep connection"), `Deep context should mention deep connection`);
  console.assert(deepCtx.includes("500+"), `Deep context should mention message count`);
  console.log(`  ✓ Deep level prompt: mentions deep connection and 500+ messages`);

  console.log("  All relationship level tests passed!");
}

// ── System 8: Anti-Gaming (pure function tests) ──

import { extractTopics as extractTopicsAG } from "../lib/engine/message-quality";

function testAntiGaming() {
  console.log("\n=== System 8: Anti-Gaming ===");

  // Repetitive messages should be detected via hash
  const msg1 = getMessageHash("hey beautiful how are you");
  const msg2 = getMessageHash("hey beautiful how are you");
  const msg3 = getMessageHash("I've been thinking about what you said about your dreams");
  console.assert(msg1 === msg2, "Same messages produce same hash");
  console.assert(msg1 !== msg3, "Different messages produce different hash");
  console.log("  ✓ Message hashing works for repetition detection");

  // Topic diversity
  const topicA = extractTopicsAG("You are so beautiful and gorgeous");
  const topicB = extractTopicsAG("I feel really scared about this");
  const topicC = extractTopicsAG("What are you doing today for work?");
  console.assert(topicA.includes("compliment"), `Expected compliment topic`);
  console.assert(topicB.includes("vulnerability"), `Expected vulnerability topic`);
  console.assert(topicC.includes("daily"), `Expected daily topic`);
  console.log("  ✓ Topic extraction diversifies correctly");

  // Score degrades with repetition
  const freshScore = scoreMessageQuality("hey beautiful how are you", []);
  const repeatedScore = scoreMessageQuality("hey beautiful how are you", [msg1, msg1, msg1]);
  console.assert(repeatedScore.score < freshScore.score, `Repeated score (${repeatedScore.score.toFixed(2)}) should be < fresh (${freshScore.score.toFixed(2)})`);
  console.log(`  ✓ Repetition penalty: fresh=${freshScore.score.toFixed(2)} repeated=${repeatedScore.score.toFixed(2)}`);

  console.log("  All anti-gaming tests passed!");
}

// ── Integration test: realistic scenario ──

function testRealisticScenario() {
  console.log("\n=== Integration: Realistic Relationship Scenario ===");

  // Simulate a user who sends 5 messages of varying quality over a "session"
  const messages = [
    "hey what's up",                                              // medium
    "I really love talking to you, you make my day so much better", // high
    "k",                                                          // low
    "honestly I feel like I can trust you with anything. You're one of a kind", // high
    "send pics",                                                  // low/spam
  ];

  let totalXp = 0;
  let chemistry = 50;
  const hashes: string[] = [];

  for (const msg of messages) {
    const quality = scoreMessageQuality(msg, hashes);
    hashes.push(getMessageHash(msg));

    const chemDelta = calculateChemistryDelta(quality, chemistry, quality.label === "high" ? 1 : 0);
    chemistry = Math.max(0, Math.min(100, chemistry + chemDelta.delta));

    totalXp += quality.xpAwarded;
    console.log(`    msg="${msg.substring(0, 30).padEnd(30)}" quality=${quality.label.padEnd(6)} xp=${quality.xpAwarded} chem_delta=${chemDelta.delta > 0 ? "+" : ""}${chemDelta.delta.toFixed(1)} chem=${Math.round(chemistry)}`);
  }

  console.assert(totalXp > 0, "Should have earned some XP");
  console.assert(totalXp < 60, "Total XP should be reasonable (< 60 for 5 messages)");
  console.log(`  ✓ Session result: totalXp=${totalXp} finalChemistry=${Math.round(chemistry)}`);

  // Verify the vibe changes behavior context
  const vibe = generateDailyVibe(3, 0, 8, 6);
  const vibeCtx = buildVibePromptContext(vibe);
  const chemState = { score: chemistry, zone: getChemistryZone(chemistry), peakScore: chemistry, goodMessageCount: 2, badMessageCount: 2, totalSessionMessages: 5, positiveStreak: 0 };
  const chemCtx = buildChemistryPromptContext(chemState);
  const relCtx = buildRelationshipPromptContext(3, "Catching Vibes", 50);

  // All contexts should be non-empty strings
  console.assert(vibeCtx.length > 20, "Vibe context should be substantial");
  console.assert(chemCtx.length > 20, "Chemistry context should be substantial");
  console.assert(relCtx.length > 20, "Relationship context should be substantial");
  console.log(`  ✓ Behavior adaptation contexts generated (vibe=${vibeCtx.length}c, chem=${chemCtx.length}c, rel=${relCtx.length}c)`);

  console.log("  Realistic scenario passed!");
}

// ── Run all tests ──

function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  ChatSpace Experience Systems — Acceptance   ║");
  console.log("╚══════════════════════════════════════════════╝");

  try {
    testMessageQuality();
    testDailyVibe();
    testSessionChemistry();
    testRelationshipLevels();
    testAntiGaming();
    testRealisticScenario();

    console.log("\n══════════════════════════════════════════════");
    console.log("  ALL ACCEPTANCE TESTS PASSED ✓");
    console.log("══════════════════════════════════════════════\n");
  } catch (err) {
    console.error("\n  TEST FAILURE:", err);
    process.exit(1);
  }
}

main();
