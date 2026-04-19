/**
 * Acceptance test for System 2 — Daily Vibe System.
 *
 * Verifies:
 *   1. pickVibe is deterministic given a fixed RNG (reproducibility)
 *   2. All weights produce valid vibes (no undefined / empty picks)
 *   3. Relationship level shifts the vibe distribution in the expected direction
 *   4. Long absence biases toward "missing_you" / "distant"
 *   5. getOrGenerateDailyVibe returns the same record on second call (same day)
 *   6. getVibePromptContext yields a non-empty string with the mood label
 *   7. The prompt line is clearly marked as invisible to the user
 */

import {
  pickVibe,
  getOrGenerateDailyVibe,
  getVibePromptContext,
  ALL_VIBES,
  type Vibe,
} from "../lib/engine/vibe-engine";

// Minimal Supabase mock focused on the vibe table only.
interface Store {
  persona_daily_vibes: Array<Record<string, unknown>>;
}
function uuid() { return "id-" + Math.random().toString(36).slice(2, 10); }

function makeClient(store: Store) {
  function from() {
    const filters: Array<{ col: string; val: unknown }> = [];
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = (c: string, v: unknown) => { filters.push({ col: c, val: v }); return builder; };
    builder.single = async () => {
      const rows = store.persona_daily_vibes.filter(r => filters.every(f => r[f.col] === f.val));
      return { data: rows[0] || null, error: rows[0] ? null : { code: "PGRST116" } };
    };
    builder.insert = (payload: Record<string, unknown>) => {
      const row = { id: uuid(), created_at: new Date().toISOString(), ...payload };
      store.persona_daily_vibes.push(row);
      const inner: Record<string, unknown> = {};
      inner.select = () => inner;
      inner.single = async () => ({ data: row, error: null });
      return inner;
    };
    return builder;
  }
  return { from };
}

// ── Assertion helpers ──
let passed = 0, failed = 0;
const failures: string[] = [];
function assert(c: boolean, label: string, detail?: string) {
  if (c) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; failures.push(label + (detail ? `  — ${detail}` : "")); console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`); }
}

// ── Tests ──

function testDeterministic() {
  console.log("\n[1] Picker is deterministic given fixed RNG");
  const rng = mulberry32(42);
  const a = pickVibe({ relationshipLevel: 3, daysSinceLastTalk: 0, random: rng });
  const rng2 = mulberry32(42);
  const b = pickVibe({ relationshipLevel: 3, daysSinceLastTalk: 0, random: rng2 });
  assert(a.vibe === b.vibe, "same seed → same vibe", `got ${a.vibe} vs ${b.vibe}`);
  assert(a.intensity === b.intensity, "same seed → same intensity");
}

function testAllVibesValid() {
  console.log("\n[2] All picks land on valid vibes");
  let bad = 0;
  for (let i = 0; i < 500; i++) {
    const v = pickVibe({ relationshipLevel: (i % 5) + 1, daysSinceLastTalk: i % 7 });
    if (!ALL_VIBES.includes(v.vibe)) bad++;
    if (v.intensity < 0 || v.intensity > 1) bad++;
  }
  assert(bad === 0, "no invalid vibes or intensities across 500 picks");
}

function countDistribution(level: number, days: number, n = 2000): Record<Vibe, number> {
  const counts: Record<string, number> = {};
  ALL_VIBES.forEach(v => counts[v] = 0);
  for (let i = 0; i < n; i++) {
    const v = pickVibe({ relationshipLevel: level, daysSinceLastTalk: days });
    counts[v.vibe]++;
  }
  return counts as Record<Vibe, number>;
}

function testRelationshipStageShift() {
  console.log("\n[3] Higher relationship level skews away from shy toward affectionate");
  const lowLevel = countDistribution(1, 0);
  const highLevel = countDistribution(5, 0);
  assert(highLevel.affectionate > lowLevel.affectionate, "affectionate is more common at level 5 than level 1",
    `lvl1=${lowLevel.affectionate} lvl5=${highLevel.affectionate}`);
  assert(lowLevel.shy > highLevel.shy, "shy is more common at level 1 than level 5",
    `lvl1=${lowLevel.shy} lvl5=${highLevel.shy}`);
}

function testAbsenceShift() {
  console.log("\n[4] Long absence biases toward missing_you / distant");
  const close = countDistribution(3, 0);
  const far = countDistribution(3, 5);
  assert(far.missing_you > close.missing_you, "missing_you rises after days apart",
    `close=${close.missing_you} far=${far.missing_you}`);
  assert(far.distant >= close.distant, "distant at least as common after absence",
    `close=${close.distant} far=${far.distant}`);
}

async function testSameDayCaches() {
  console.log("\n[5] Same-day generation reuses the first vibe");
  const store: Store = { persona_daily_vibes: [] };
  const client = makeClient(store);
  const userId = uuid();
  const personaId = uuid();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = await getOrGenerateDailyVibe(client as any, userId, personaId, {
    relationshipLevel: 2,
    lastMessageAt: null,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const second = await getOrGenerateDailyVibe(client as any, userId, personaId, {
    relationshipLevel: 2,
    lastMessageAt: null,
  });
  assert(first.id === second.id, "second call returns the same stored vibe", `first=${first.id} second=${second.id}`);
  assert(store.persona_daily_vibes.length === 1, "only one row written", `rows=${store.persona_daily_vibes.length}`);
}

function testPromptContext() {
  console.log("\n[6] Prompt context string is formed correctly");
  const high = getVibePromptContext("clingy", 0.95);
  const low = getVibePromptContext("calm", 0.3);
  assert(high.includes("CLINGY"), "clingy prompt contains the mood label");
  assert(high.includes("INVISIBLE TO USER"), "prompt is flagged invisible to the user");
  assert(high.includes("Lean fully"), "high intensity adds a 'lean fully' note");
  assert(low.includes("softly underneath"), "low intensity adds a softer note");
  const mid = getVibePromptContext("playful", 0.6);
  assert(!mid.includes("Lean fully") && !mid.includes("softly"), "mid intensity has no extra note");
}

// ── Deterministic RNG ──
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  console.log("═══ Daily Vibe System — Acceptance Tests ═══");
  testDeterministic();
  testAllVibesValid();
  testRelationshipStageShift();
  testAbsenceShift();
  await testSameDayCaches();
  testPromptContext();

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failed > 0) {
    console.log("\nFailures:"); failures.forEach(f => console.log("  - " + f));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
