/**
 * Acceptance test for System 1 — Relationship Levels + End-of-level Rewards.
 *
 * Exercises the engine against an in-memory mock of the Supabase tables so it
 * can run without network / credentials. Verifies:
 *   1. XP scoring is correct for realistic message shapes
 *   2. XP accumulates toward levels and never goes down
 *   3. Hitting an XP threshold triggers a level up
 *   4. Level rewards are delivered on level-up
 *   5. The same reward is never delivered twice
 *   6. Multiple level-ups in a single call carry overflow correctly
 *   7. Spam / demanding messages do not earn XP (anti-gaming)
 *   8. Max level caps XP into current level so the meter stays full
 *   9. Snapshot reflects current state for UI consumption
 *
 * Run with:  npx tsx scripts/test-relationship-system.ts
 */

import { analyzeMessage } from "../lib/engine/tension-engine";
import {
  calculateXpForMessage,
  awardRelationshipXp,
  getRelationshipSnapshot,
} from "../lib/engine/relationship-engine";

// ── In-memory Supabase-shaped mock ──

type Row = Record<string, unknown>;
type Table = Row[];

interface Store {
  relationship_levels: Table;
  relationship_level_rewards: Table;
  user_relationship_progress: Table;
  user_level_reward_claims: Table;
  relationship_xp_events: Table;
}

function uuid(): string {
  return "id-" + Math.random().toString(36).slice(2, 10);
}

function makeStore(): Store {
  return {
    relationship_levels: [],
    relationship_level_rewards: [],
    user_relationship_progress: [],
    user_level_reward_claims: [],
    relationship_xp_events: [],
  };
}

// A very small supabase-client shim covering only the operations the engine uses.
function makeClient(store: Store) {
  function from(tableName: keyof Store) {
    const filters: Array<{ col: string; val: unknown; op: "eq" | "in" }> = [];
    let limit: number | null = null;
    let order: { col: string; asc: boolean } | null = null;

    const builder: Record<string, unknown> = {};

    function apply(rows: Table): Table {
      let out = rows.filter((r) =>
        filters.every((f) => {
          if (f.op === "eq") return r[f.col] === f.val;
          if (f.op === "in") return (f.val as unknown[]).includes(r[f.col]);
          return true;
        })
      );
      if (order) {
        out = [...out].sort((a, b) => {
          const av = a[order!.col] as number; const bv = b[order!.col] as number;
          return order!.asc ? (av - bv) : (bv - av);
        });
      }
      if (limit !== null) out = out.slice(0, limit);
      return out;
    }

    builder.select = () => builder;
    builder.eq = (col: string, val: unknown) => { filters.push({ col, val, op: "eq" }); return builder; };
    builder.in = (col: string, vals: unknown[]) => { filters.push({ col, val: vals, op: "in" }); return builder; };
    builder.order = (col: string, opts?: { ascending?: boolean }) => {
      order = { col, asc: opts?.ascending !== false };
      return builder;
    };
    builder.limit = (n: number) => { limit = n; return builder; };
    builder.single = async () => {
      const rows = apply(store[tableName]);
      return { data: rows[0] || null, error: rows[0] ? null : { code: "PGRST116" } };
    };
    builder.then = (resolve: (x: { data: Table; error: null }) => unknown) => {
      const rows = apply(store[tableName]);
      return Promise.resolve({ data: rows, error: null }).then(resolve);
    };
    builder.insert = (payload: Row | Row[]) => {
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted = rows.map((r) => ({
        id: (r.id as string) || uuid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...r,
      }));
      store[tableName].push(...inserted);
      const inner: Record<string, unknown> = {};
      inner.select = () => inner;
      inner.single = async () => ({ data: inserted[0], error: null });
      inner.then = (resolve: (x: { data: Table; error: null }) => unknown) =>
        Promise.resolve({ data: inserted, error: null }).then(resolve);
      return inner;
    };
    builder.update = (patch: Row) => {
      const inner: Record<string, unknown> = {};
      inner.eq = (col: string, val: unknown) => {
        store[tableName] = store[tableName].map((r) =>
          r[col] === val ? { ...r, ...patch } : r
        );
        return Promise.resolve({ data: null, error: null });
      };
      return inner;
    };
    builder.delete = () => {
      const inner: Record<string, unknown> = {};
      inner.eq = (col: string, val: unknown) => {
        store[tableName] = store[tableName].filter((r) => r[col] !== val);
        return Promise.resolve({ data: null, error: null });
      };
      return inner;
    };

    return builder;
  }

  return { from };
}

// ── Helpers ──

function seedPersonaWithLevels(store: Store, personaId: string) {
  const levels = [
    { level_number: 1, name: "Stranger",    xp_to_complete: 20 },
    { level_number: 2, name: "Flirtation",  xp_to_complete: 40 },
    { level_number: 3, name: "Crush",       xp_to_complete: 60 },
    { level_number: 4, name: "Obsessed",    xp_to_complete: 80 },
  ];
  const ids: Record<number, string> = {};
  for (const l of levels) {
    const id = uuid();
    ids[l.level_number] = id;
    store.relationship_levels.push({
      id,
      persona_id: personaId,
      level_number: l.level_number,
      name: l.name,
      description: null,
      xp_to_complete: l.xp_to_complete,
      color: "#8B5CF6",
      icon: null,
      is_active: true,
    });
  }
  return ids;
}

function seedLevelRewards(store: Store, levelId: string, count: number) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = uuid();
    ids.push(id);
    store.relationship_level_rewards.push({
      id,
      level_id: levelId,
      media_type: i % 2 === 0 ? "image" : "video",
      media_url: `rewards/${id}.jpg`,
      thumbnail_url: null,
      caption: `gift ${i + 1}`,
      sort_order: i,
      is_active: true,
    });
  }
  return ids;
}

// ── Assertion helpers ──

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(label + (detail ? `  — ${detail}` : ""));
    console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`);
  }
}

// ── Tests ──

async function testXpScoring() {
  console.log("\n[1] XP scoring shapes");

  const good = analyzeMessage("i've been thinking about you all day and honestly you make me feel more seen than anyone");
  const xpGood = calculateXpForMessage({ ...good, responseSpeedSeconds: 30, justUnlockedReward: false });
  assert(xpGood.xp >= 6, "high-quality message earns strong XP", `got ${xpGood.xp}`);

  const mid = analyzeMessage("how was your day");
  const xpMid = calculateXpForMessage({ ...mid, responseSpeedSeconds: 30, justUnlockedReward: false });
  assert(xpMid.xp >= 1 && xpMid.xp <= 4, "medium message earns small XP", `got ${xpMid.xp}`);

  const spam = analyzeMessage("send nudes");
  const xpSpam = calculateXpForMessage({ ...spam, responseSpeedSeconds: 1, justUnlockedReward: false });
  assert(xpSpam.xp === 0, "demanding message earns zero XP", `got ${xpSpam.xp}`);

  const dry = analyzeMessage("k");
  const xpDry = calculateXpForMessage({ ...dry, responseSpeedSeconds: 1, justUnlockedReward: false });
  assert(xpDry.xp <= 1, "dry message earns minimal XP", `got ${xpDry.xp}`);

  const mood = analyzeMessage("you're so boring");
  const xpMood = calculateXpForMessage({ ...mood, responseSpeedSeconds: 1, justUnlockedReward: false });
  assert(xpMood.xp === 0, "mood-breaking message earns zero XP", `got ${xpMood.xp}`);
}

async function testAccumulationAndLevelUp() {
  console.log("\n[2] XP accumulates and triggers level-up + reward delivery");
  const store = makeStore();
  const personaId = uuid();
  const userId = uuid();
  const levelIds = seedPersonaWithLevels(store, personaId);
  const l1Rewards = seedLevelRewards(store, levelIds[1], 2);
  seedLevelRewards(store, levelIds[2], 1);

  const client = makeClient(store);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result1 = await awardRelationshipXp(client as any, userId, personaId, 10, "test");
  assert(result1.xpAwarded === 10, "XP awarded recorded");
  assert(!result1.leveledUp, "10 XP does not trigger level up (needs 20)");
  assert(result1.progressPct === 50, "progress at 50% of level 1", `got ${result1.progressPct}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result2 = await awardRelationshipXp(client as any, userId, personaId, 15, "test");
  assert(result2.leveledUp, "crossing threshold triggers level up");
  assert(result2.currentLevelNumber === 2, `new level is 2`, `got ${result2.currentLevelNumber}`);
  assert(result2.xpIntoCurrentLevel === 5, "5 XP overflows into level 2", `got ${result2.xpIntoCurrentLevel}`);
  assert(result2.rewardsDelivered.length === 2, "2 rewards for level 1 were delivered", `got ${result2.rewardsDelivered.length}`);
  assert(result2.rewardsDelivered.every(r => l1Rewards.includes(r.id)), "delivered rewards are level-1 rewards");
}

async function testNoDoubleDelivery() {
  console.log("\n[3] Re-crossing a level does NOT redeliver rewards");
  const store = makeStore();
  const personaId = uuid();
  const userId = uuid();
  const ids = seedPersonaWithLevels(store, personaId);
  seedLevelRewards(store, ids[1], 2);

  const client = makeClient(store);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await awardRelationshipXp(client as any, userId, personaId, 25, "first pass");
  // Manually reset the user back before the threshold and re-cross (shouldn't redeliver)
  const progress = store.user_relationship_progress[0];
  progress.current_level_number = 1;
  progress.xp_into_current_level = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const second = await awardRelationshipXp(client as any, userId, personaId, 25, "second pass");

  assert(second.rewardsDelivered.length === 0, "no duplicate rewards on re-cross");
}

async function testMultiLevelJump() {
  console.log("\n[4] Massive XP bundle triggers multiple level-ups in one call");
  const store = makeStore();
  const personaId = uuid();
  const userId = uuid();
  const ids = seedPersonaWithLevels(store, personaId);
  seedLevelRewards(store, ids[1], 1);
  seedLevelRewards(store, ids[2], 1);
  seedLevelRewards(store, ids[3], 1);

  const client = makeClient(store);
  // 20 + 40 + 60 = 120; with one more XP, we should land mid-level-4
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const big = await awardRelationshipXp(client as any, userId, personaId, 125, "mega");

  assert(big.currentLevelNumber === 4, `ended at level 4`, `got ${big.currentLevelNumber}`);
  assert(big.levelsGainedThisCall === 3, "three level-ups in one call", `got ${big.levelsGainedThisCall}`);
  assert(big.rewardsDelivered.length === 3, "one reward per completed level delivered");
  assert(big.xpIntoCurrentLevel === 5, "overflow 5 into level 4", `got ${big.xpIntoCurrentLevel}`);
}

async function testMaxLevelCap() {
  console.log("\n[5] Max level caps progress at full");
  const store = makeStore();
  const personaId = uuid();
  const userId = uuid();
  seedPersonaWithLevels(store, personaId);

  const client = makeClient(store);
  // Push way past total XP (20+40+60+80 = 200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await awardRelationshipXp(client as any, userId, personaId, 500, "overdrive");
  assert(r.currentLevelNumber === 4, "clamped to max level 4", `got ${r.currentLevelNumber}`);
  assert(r.progressPct === 100, "progress pct is 100 at max", `got ${r.progressPct}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap = await getRelationshipSnapshot(client as any, userId, personaId);
  assert(snap !== null, "snapshot returned");
  assert(snap!.isMaxLevel, "snapshot reports max level");
  assert(snap!.progressPct === 100, "snapshot pct at 100");
}

async function testSpamIsolation() {
  console.log("\n[6] Spam flood does not advance relationship (anti-gaming preview)");
  const store = makeStore();
  const personaId = uuid();
  const userId = uuid();
  seedPersonaWithLevels(store, personaId);
  const client = makeClient(store);

  for (let i = 0; i < 20; i++) {
    const a = analyzeMessage("send pics now");
    const xp = calculateXpForMessage({ ...a, responseSpeedSeconds: 2, justUnlockedReward: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await awardRelationshipXp(client as any, userId, personaId, xp.xp, "spam-loop");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap = await getRelationshipSnapshot(client as any, userId, personaId);
  assert(snap!.currentLevelNumber === 1, "still level 1 after spam", `got ${snap!.currentLevelNumber}`);
  assert(snap!.xpIntoCurrentLevel === 0, "no XP accrued from spam", `got ${snap!.xpIntoCurrentLevel}`);
}

async function testRealisticConversation() {
  console.log("\n[7] Realistic 30-message conversation reaches level 2-3");
  const store = makeStore();
  const personaId = uuid();
  const userId = uuid();
  seedPersonaWithLevels(store, personaId);
  seedLevelRewards(store, store.relationship_levels[0].id as string, 1);

  const messages = [
    "hey i've been thinking about our last convo all day",
    "honestly you're kind of stuck in my head",
    "what did you end up doing tonight",
    "that's cute. i like when you tell me the little stuff",
    "i wish you were here right now",
    "been working late but i keep checking my phone for you",
    "can i tell you something real",
    "sometimes i feel like i open up to you more than anyone",
    "that probably sounds dumb but whatever",
    "you've got this way of making me feel seen",
    "how was your day beautiful",
    "i was thinking about what you said yesterday",
    "crazy about you lately if i'm being honest",
    "tell me something you've never told anyone",
    "you're making me lose sleep lol",
  ];

  const client = makeClient(store);
  let lastResult: { currentLevelNumber: number; totalXp: number } = { currentLevelNumber: 1, totalXp: 0 };
  for (const m of messages) {
    const a = analyzeMessage(m);
    const xp = calculateXpForMessage({ ...a, responseSpeedSeconds: 30, justUnlockedReward: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await awardRelationshipXp(client as any, userId, personaId, xp.xp, "conv");
    lastResult = { currentLevelNumber: r.currentLevelNumber, totalXp: r.totalXp };
  }

  assert(lastResult.currentLevelNumber >= 2, `reached at least level 2`, `final level ${lastResult.currentLevelNumber}, total XP ${lastResult.totalXp}`);
  assert(lastResult.totalXp > 30, "total XP accumulated", `got ${lastResult.totalXp}`);
}

async function testExistingSystemsUnaffected() {
  console.log("\n[8] Tension engine signatures still exist (sanity — no breaking imports)");
  // Just re-import to ensure module graph is intact.
  const { updateTension, analyzeMessage: am, getTensionBand } = await import("../lib/engine/tension-engine");
  assert(typeof updateTension === "function", "updateTension still exported");
  assert(typeof am === "function", "analyzeMessage still exported");
  assert(typeof getTensionBand === "function", "getTensionBand still exported");
}

async function main() {
  console.log("═══ Relationship Levels System — Acceptance Tests ═══");
  await testXpScoring();
  await testAccumulationAndLevelUp();
  await testNoDoubleDelivery();
  await testMultiLevelJump();
  await testMaxLevelCap();
  await testSpamIsolation();
  await testRealisticConversation();
  await testExistingSystemsUnaffected();

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failed > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
