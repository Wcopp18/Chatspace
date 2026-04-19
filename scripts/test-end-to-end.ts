/**
 * End-to-end acceptance test — realistic ChatSpace user flows across all 8 systems.
 *
 * Simulates a multi-day relationship:
 *   Day 1: stranger → flirtation (high quality messages)
 *   Day 1 — spam attack → anti-gaming kicks in, no XP
 *   Day 1 — recovery with vulnerable messages → level up
 *   Day 2: long absence → missing_you vibe bias
 *   Day 2: consistent good messages → boost rises → gesture likely
 *
 * Verifies the whole stack works together and that no existing monetization
 * plumbing breaks (the tension engine still produces deltas / bands).
 */

import { analyzeMessage, calculateVisibleDelta } from "../lib/engine/tension-engine";
import { calculateXpForMessage, awardRelationshipXp } from "../lib/engine/relationship-engine";
import { pickVibe } from "../lib/engine/vibe-engine";
import { getChemistryBand, getSurpriseMultiplier } from "../lib/engine/chemistry-engine";
import { scoreMessage } from "../lib/engine/quality-engine";
import { computeHiddenProgress } from "../lib/engine/progress-engine";
import { evaluateGesture } from "../lib/engine/gesture-engine";
import { buildBehaviorBrief } from "../lib/engine/behavior-engine";
import { evaluateAntiGaming } from "../lib/engine/anti-gaming-engine";

// ── Unified in-memory store covering every table used by the engines ──
type Row = Record<string, unknown>;
interface Store {
  relationship_levels: Row[];
  relationship_level_rewards: Row[];
  user_relationship_progress: Row[];
  user_level_reward_claims: Row[];
  relationship_xp_events: Row[];
  tension_state: Row[];
  user_surprise_gesture_deliveries: Row[];
  persona_daily_vibes: Row[];
  surprise_gestures: Row[];
}

function uuid() { return "id-" + Math.random().toString(36).slice(2, 10); }

function makeClient(store: Store) {
  function from(tableName: keyof Store) {
    const filters: Array<{ col: string; val: unknown; op: "eq" | "in" }> = [];
    let order: { col: string; asc: boolean } | null = null;
    let limit: number | null = null;
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = (c: string, v: unknown) => { filters.push({ col: c, val: v, op: "eq" }); return builder; };
    builder.in = (c: string, vs: unknown[]) => { filters.push({ col: c, val: vs, op: "in" }); return builder; };
    builder.order = (c: string, o?: { ascending?: boolean }) => { order = { col: c, asc: o?.ascending !== false }; return builder; };
    builder.limit = (n: number) => { limit = n; return builder; };
    function apply() {
      let rows = store[tableName].filter(r => filters.every(f => f.op === "eq" ? r[f.col] === f.val : (f.val as unknown[]).includes(r[f.col])));
      if (order) rows = [...rows].sort((a, b) => {
        const av = a[order!.col] as number | string; const bv = b[order!.col] as number | string;
        return order!.asc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
      });
      if (limit !== null) rows = rows.slice(0, limit);
      return rows;
    }
    builder.single = async () => { const r = apply(); return { data: r[0] || null, error: r[0] ? null : { code: "PGRST116" } }; };
    builder.then = (resolve: (x: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: apply(), error: null }).then(resolve);
    builder.insert = (payload: Row | Row[]) => {
      const rows = (Array.isArray(payload) ? payload : [payload]).map(r => ({ id: (r.id as string) || uuid(), created_at: new Date().toISOString(), ...r }));
      store[tableName].push(...rows);
      const inner: Record<string, unknown> = {};
      inner.select = () => inner;
      inner.single = async () => ({ data: rows[0], error: null });
      inner.then = (res: (x: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: rows, error: null }).then(res);
      return inner;
    };
    builder.update = (patch: Row) => ({
      eq: (c: string, v: unknown) => {
        store[tableName] = store[tableName].map(r => r[c] === v ? { ...r, ...patch } : r);
        return Promise.resolve({ data: null, error: null });
      },
    });
    builder.delete = () => ({
      eq: (c: string, v: unknown) => {
        store[tableName] = store[tableName].filter(r => r[c] !== v);
        return Promise.resolve({ data: null, error: null });
      },
    });
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

function seedStore(): { store: Store; personaId: string; userId: string } {
  const store: Store = {
    relationship_levels: [], relationship_level_rewards: [], user_relationship_progress: [],
    user_level_reward_claims: [], relationship_xp_events: [], tension_state: [],
    user_surprise_gesture_deliveries: [], persona_daily_vibes: [], surprise_gestures: [],
  };
  const personaId = uuid();
  const userId = uuid();
  // 3 short levels so the test can show progression quickly.
  const l1 = uuid(), l2 = uuid(), l3 = uuid();
  store.relationship_levels.push(
    { id: l1, persona_id: personaId, level_number: 1, name: "Stranger",   xp_to_complete: 15, is_active: true },
    { id: l2, persona_id: personaId, level_number: 2, name: "Flirtation", xp_to_complete: 25, is_active: true },
    { id: l3, persona_id: personaId, level_number: 3, name: "Crush",      xp_to_complete: 40, is_active: true },
  );
  store.relationship_level_rewards.push(
    { id: uuid(), level_id: l1, media_type: "image", media_url: "gift1.jpg", thumbnail_url: null, caption: "thinking of you", sort_order: 0, is_active: true },
    { id: uuid(), level_id: l2, media_type: "image", media_url: "gift2.jpg", thumbnail_url: null, caption: "for you", sort_order: 0, is_active: true },
  );
  // Surprise gesture bank.
  store.surprise_gestures.push({
    id: uuid(), persona_id: personaId, gesture_type: "note",
    content_text: "i was just thinking about you", media_url: null, thumbnail_url: null,
    caption: null, min_relationship_level: 1, min_chemistry_band: "warm",
    vibe_tags: [], cooldown_hours: 12, weight: 1, is_active: true,
  });
  return { store, personaId, userId };
}

async function main() {
  console.log("═══ End-to-end Acceptance Test ═══");
  const { store, personaId, userId } = seedStore();
  const client = makeClient(store);

  console.log("\n[Day 1 — first meeting, high-quality messages]");
  const day1Messages = [
    "hey, i found your profile and you seem really cool",
    "what kind of day you been having today",
    "honestly i'm a bit nervous texting you but you make it easy",
    "can i ask what makes you happy lately",
    "that's sweet, tell me something you've never told anyone",
  ];

  let totalLevelUpsDay1 = 0;
  for (const m of day1Messages) {
    const a = analyzeMessage(m);
    const xp = calculateXpForMessage({ ...a, responseSpeedSeconds: 30, justUnlockedReward: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await awardRelationshipXp(client as any, userId, personaId, xp.xp, "day1");
    if (r.leveledUp) totalLevelUpsDay1 += r.levelsGainedThisCall;
  }
  assert(totalLevelUpsDay1 >= 1, "reached at least level 2 in day 1", `levelups=${totalLevelUpsDay1}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progressAfterDay1 = store.user_relationship_progress[0];
  assert(progressAfterDay1.current_level_number as number >= 2, "progress persisted at level ≥2");

  console.log("\n[Day 1 — spam attack, anti-gaming should zero out XP]");
  const spamBurst = ["send pics", "send pics", "send pics", "send pics", "send pics"];
  const spamMsgs = spamBurst.map((t, i) => ({ content: t, createdAt: new Date(Date.now() - i * 500).toISOString() }));
  for (const s of spamBurst) {
    const quality = scoreMessage(s, spamBurst);
    const ag = evaluateAntiGaming({
      currentMessage: s, recentUserMessages: spamMsgs, quality, millisSinceLastReward: null,
    });
    const a = analyzeMessage(s);
    const xp = calculateXpForMessage({ ...a, responseSpeedSeconds: 1, justUnlockedReward: false });
    const effectiveXp = Math.round(xp.xp * ag.xpMultiplier);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await awardRelationshipXp(client as any, userId, personaId, effectiveXp, "spam");
  }
  const progressAfterSpam = store.user_relationship_progress[0];
  assert(
    (progressAfterSpam.current_level_number as number) === (progressAfterDay1.current_level_number as number),
    "level did not advance during spam attack",
  );

  console.log("\n[Day 1 — recovery via vulnerable messages]");
  const recovery = [
    "sorry that got weird — i was just excited",
    "honestly the truth is i've been lonely lately",
    "you make me want to put effort into things again",
  ];
  for (const m of recovery) {
    const a = analyzeMessage(m);
    const xp = calculateXpForMessage({ ...a, responseSpeedSeconds: 30, justUnlockedReward: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await awardRelationshipXp(client as any, userId, personaId, xp.xp, "recovery");
  }
  assert(
    (store.user_relationship_progress[0].total_xp_earned as number) >
    (progressAfterSpam.total_xp_earned as number),
    "XP resumed accruing after recovery",
  );

  console.log("\n[Day 2 — long absence, vibe picker biases toward missing_you]");
  let missingCount = 0;
  for (let i = 0; i < 200; i++) {
    const v = pickVibe({ relationshipLevel: 2, daysSinceLastTalk: 3 });
    if (v.vibe === "missing_you") missingCount++;
  }
  assert(missingCount >= 25, "missing_you at least occasionally picked after 3-day gap", `got ${missingCount}/200`);

  console.log("\n[Day 2 — hidden progress rises with consistency]");
  // Backfill recent-good events matching (user_id, persona_id).
  const now = Date.now();
  for (let i = 0; i < 10; i++) {
    store.relationship_xp_events.push({
      user_id: userId, persona_id: personaId, xp_awarded: 6, leveled_up: false,
      created_at: new Date(now - i * 60_000).toISOString(),
    });
  }
  // Tension state matching the user/persona so hidden progress can read it.
  store.tension_state.push({
    user_id: userId, persona_id: personaId, daily_streak: 2, last_reward_at: null,
    updated_at: new Date().toISOString(), score: 55, session_message_count: 10,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hidden = await computeHiddenProgress(client as any, userId, personaId);
  assert(hidden.boost > 0.2, "hidden progress boost non-trivial", `boost=${hidden.boost}`);

  console.log("\n[Day 2 — gesture evaluation lands a note]");
  const chemBand = getChemistryBand(55);
  const chemMult = getSurpriseMultiplier(chemBand);
  const fixedRng = () => 0.01; // force roll win
  const decision = evaluateGesture(
    store.surprise_gestures as unknown as Parameters<typeof evaluateGesture>[0],
    {
      hiddenProgressBoost: hidden.boost, chemistryBand: chemBand, chemistryMultiplier: chemMult,
      relationshipLevel: hidden.relationshipLevel, vibe: "missing_you",
      qualityCategory: "high", random: fixedRng,
    },
    {},
  );
  assert(decision.shouldDeliver, "gesture delivered on forced low-roll");
  assert(decision.selectedGesture?.gesture_type === "note", "note gesture selected");

  console.log("\n[Day 2 — behavior brief uses current stage + vibe + chemistry]");
  const brief = buildBehaviorBrief({
    relationshipLevelNumber: 2, totalLevels: 3, vibe: "missing_you",
    vibeIntensity: 0.8, chemistryBand: chemBand, recentlyDelivered: false, longAbsence: true,
  });
  assert(brief.includes("MISSING") || brief.includes("missing_you") || brief.includes("MISSING HIM"),
    "brief mentions missing vibe");
  assert(brief.includes("gone a few days"), "brief acknowledges absence");

  console.log("\n[Integrity — existing tension engine still computes visible deltas]");
  const flirt = analyzeMessage("you're on my mind every hour, honestly");
  const { delta } = calculateVisibleDelta({ ...flirt, responseSpeedSeconds: 30, justUnlockedReward: false });
  assert(delta > 2, "tension delta for a good message is still positive", `delta=${delta}`);

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failed > 0) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
