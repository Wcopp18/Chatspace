/**
 * Acceptance test for System 5 — Hidden Progress.
 *
 * Verifies:
 *   1. No recent activity → small starter boost (no prior gesture)
 *   2. Many recent good messages → higher boost
 *   3. Cooldown after recent gesture → boost zeroed
 *   4. Long drought since last gesture → boost rises
 *   5. High relationship level → boost dampened
 *   6. Daily streak contributes
 *   7. Consecutive good run contributes
 *   8. Boost stays in [0,1]
 */

import { computeHiddenProgress } from "../lib/engine/progress-engine";

type Row = Record<string, unknown>;
interface Store {
  relationship_xp_events: Row[];
  tension_state: Row[];
  user_relationship_progress: Row[];
}

function makeClient(store: Store) {
  function from(tableName: keyof Store) {
    const filters: Array<{ col: string; val: unknown }> = [];
    let limit: number | null = null;
    let order: { col: string; asc: boolean } | null = null;
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = (c: string, v: unknown) => { filters.push({ col: c, val: v }); return builder; };
    builder.order = (c: string, o?: { ascending?: boolean }) => { order = { col: c, asc: o?.ascending !== false }; return builder; };
    builder.limit = (n: number) => { limit = n; return builder; };
    function apply() {
      let rows = store[tableName].filter(r => filters.every(f => r[f.col] === f.val));
      if (order) rows = [...rows].sort((a, b) => {
        const av = a[order!.col] as string; const bv = b[order!.col] as string;
        return order!.asc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
      });
      if (limit !== null) rows = rows.slice(0, limit);
      return rows;
    }
    builder.single = async () => {
      const rows = apply();
      return { data: rows[0] || null, error: rows[0] ? null : { code: "PGRST116" } };
    };
    builder.then = (resolve: (x: { data: Row[]; error: null }) => unknown) =>
      Promise.resolve({ data: apply(), error: null }).then(resolve);
    return builder;
  }
  return { from };
}

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(c: boolean, label: string, detail?: string) {
  if (c) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}${detail ? "  — " + detail : ""}`); }
}

function seedEvents(count: number, _goodThreshold = 4, xpLow = 4, xpHigh = 8): Row[] {
  const now = Date.now();
  const out: Row[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      user_id: "u1",
      persona_id: "p1",
      xp_awarded: Math.random() < 0.8 ? (xpLow + Math.floor(Math.random() * (xpHigh - xpLow + 1))) : 1,
      leveled_up: false,
      created_at: new Date(now - i * 60000).toISOString(),
    });
  }
  return out;
}

async function run() {
  console.log("\n[1] First-ever session → starter boost (no prior gesture)");
  const s1: Store = {
    relationship_xp_events: [],
    tension_state: [],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 1 }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r1 = await computeHiddenProgress(makeClient(s1) as any, "u1", "p1");
  assert(r1.boost > 0 && r1.boost < 0.25, "small starter boost", `boost=${r1.boost}`);
  assert(r1.rationale.some(x => x.includes("no_prior_gesture")), "rationale mentions no prior gesture");

  console.log("\n[2] Many recent good messages → higher boost");
  const s2: Store = {
    relationship_xp_events: seedEvents(10, 4, 5, 8),
    tension_state: [{ user_id: "u1", persona_id: "p1", daily_streak: 1, last_reward_at: null }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 2 }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r2 = await computeHiddenProgress(makeClient(s2) as any, "u1", "p1");
  assert(r2.boost > r1.boost, "boost is higher with good recent activity", `r1=${r1.boost} r2=${r2.boost}`);

  console.log("\n[3] Recent gesture cooldown → boost zeroed");
  const s3: Store = {
    relationship_xp_events: seedEvents(10, 4, 5, 8),
    tension_state: [{
      user_id: "u1", persona_id: "p1",
      daily_streak: 3, last_reward_at: new Date(Date.now() - 30_000).toISOString(), // 30s ago
    }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 2 }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r3 = await computeHiddenProgress(makeClient(s3) as any, "u1", "p1");
  assert(r3.boost === 0, "boost zero during cooldown", `boost=${r3.boost}`);
  assert(r3.rationale.some(x => x.includes("cooldown")), "rationale mentions cooldown");

  console.log("\n[4] Long drought → drought boost");
  const s4: Store = {
    relationship_xp_events: seedEvents(6, 4, 5, 7),
    tension_state: [{
      user_id: "u1", persona_id: "p1",
      daily_streak: 2, last_reward_at: new Date(Date.now() - 40 * 60_000).toISOString(), // 40 min ago
    }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 2 }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r4 = await computeHiddenProgress(makeClient(s4) as any, "u1", "p1");
  assert(r4.rationale.some(x => x.includes("drought")), "rationale mentions drought");
  assert(r4.boost >= 0.15, "drought boost is meaningful", `boost=${r4.boost}`);

  console.log("\n[5] High relationship level dampens boost");
  const baseStore = (level: number): Store => ({
    relationship_xp_events: seedEvents(10, 4, 6, 8),
    tension_state: [{ user_id: "u1", persona_id: "p1", daily_streak: 5, last_reward_at: null }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: level }],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rLow  = await computeHiddenProgress(makeClient(baseStore(2)) as any, "u1", "p1");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rHigh = await computeHiddenProgress(makeClient(baseStore(6)) as any, "u1", "p1");
  assert(rHigh.boost < rLow.boost, "level 6 has smaller boost than level 2", `lvl2=${rLow.boost} lvl6=${rHigh.boost}`);

  console.log("\n[6] Daily streak contributes");
  const noStreak: Store = {
    relationship_xp_events: seedEvents(5, 4, 5, 7),
    tension_state: [{ user_id: "u1", persona_id: "p1", daily_streak: 0, last_reward_at: null }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 1 }],
  };
  const streak7: Store = {
    relationship_xp_events: seedEvents(5, 4, 5, 7),
    tension_state: [{ user_id: "u1", persona_id: "p1", daily_streak: 7, last_reward_at: null }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 1 }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rNoStreak = await computeHiddenProgress(makeClient(noStreak) as any, "u1", "p1");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rStreak = await computeHiddenProgress(makeClient(streak7) as any, "u1", "p1");
  assert(rStreak.boost >= rNoStreak.boost, "streak helps boost", `no=${rNoStreak.boost} 7d=${rStreak.boost}`);
  assert(rStreak.dailyStreakDays === 7, "streak days reported");

  console.log("\n[7] Consecutive good run contributes");
  // All good first, then a bad one.
  const events7: Row[] = [];
  for (let i = 0; i < 5; i++) events7.push({ user_id: "u1", persona_id: "p1", xp_awarded: 6, leveled_up: false, created_at: new Date(Date.now() - i * 60_000).toISOString() });
  events7.push({ user_id: "u1", persona_id: "p1", xp_awarded: 1, leveled_up: false, created_at: new Date(Date.now() - 6 * 60_000).toISOString() });
  // Reversed so newest-first is satisfied by order() with descending
  const s7: Store = {
    relationship_xp_events: events7,
    tension_state: [{ user_id: "u1", persona_id: "p1", daily_streak: 1, last_reward_at: null }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 1 }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r7 = await computeHiddenProgress(makeClient(s7) as any, "u1", "p1");
  assert(r7.consecutiveGood === 5, "streak within events counted", `got ${r7.consecutiveGood}`);

  console.log("\n[8] Boost stays in [0,1]");
  const massiveGood: Store = {
    relationship_xp_events: seedEvents(30, 4, 8, 10),
    tension_state: [{ user_id: "u1", persona_id: "p1", daily_streak: 30, last_reward_at: null }],
    user_relationship_progress: [{ user_id: "u1", persona_id: "p1", current_level_number: 2 }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rMax = await computeHiddenProgress(makeClient(massiveGood) as any, "u1", "p1");
  assert(rMax.boost <= 1 && rMax.boost >= 0, "boost clamped", `boost=${rMax.boost}`);
}

(async () => {
  console.log("═══ Hidden Progress System — Acceptance Tests ═══");
  await run();
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failed > 0) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
})();
