# ChatSpace — Mood-Crack Monetization System

> This is the founder's strategic plan for monetization. It lives here (in the project's `.claude/` folder) so future Claude Code sessions can read it for context. The intended location was `~/.claude/plans/do-you-have-acess-vivid-summit.md` but project permissions denied that path; same content here.

---

## Context

ChatSpace is an AI companion app (Next.js 15 / Tailwind / Supabase / Vercel) targeting the parasocial-companion market. Three personas: Luna, Nova, Aria. Production at chatspace-bay.vercel.app. Working branch: `claude/chatspace-mobile-mvp-0w8yJ`.

The founder needs to monetize without two failure modes:
- **Too sleazy** → users feel hunted, churn climbs, brand decays
- **Too soft** → users would have paid, the app didn't ask, money stays in their wallet

The solution he committed to is a **psychological gameplay loop**: each persona has a hidden daily mood. The user's job is to *read* her — figure out what she wants today and respond in tune. Cracking the mood = rewards (offers, premium content, free gifts). Missing the mood = nothing fires that day. The app self-throttles based on user skill. The persona stays warm and consistent regardless of payment; the *system* handles all transactional logic.

This solves all four founder fears at once: feels real (she never asks for money), not pushy (bad readers get nothing), not soft (good readers get rewarded heavily), not predictable (mood is randomized per day).

The repo already contains ~60% of the engine for this. The plan below specifies the missing pieces, in build order.

---

## The Mechanic, Spec'd

### Daily flow

| Trigger | Result |
|---|---|
| User sends message in tune with today's vibe | `mood_crack_score` rises |
| Mood-crack score crosses threshold + tension ≥ 41 | First paid offer fires (blurred image, 2-min timer card) |
| Tension stays peak, 5+ messages later | 2nd offer fires |
| Later same day, mood still cracked | 3rd offer fires (last single of the day) |
| User keeps engaging hard after 3 unlocks | **Bundle** offer surfaces (4-7 moments, ~$14.99) |
| Day rolls over | Weekly free gift may fire (random weekday) |
| User misses the mood | Zero offers, all day. She still talks normally. |

### Hard caps (do not exceed)

- Min messages before any push: **6**
- Min seconds between pushes: **120**
- Min messages between pushes: **5**
- Max single offers per session: **2** (3 if session > 30 min and tension > 70)
- Max single offers per day: **3**
- Max paid touchpoints per day (singles + bundles + customs): **~10** for whales
- 25% random skip even when eligible (already in code)

### Pricing

- **Single subscription tier: $9.99/month.** No multi-tier.
- Subscription offer fires **only when mood is cracked + chemistry hot + ≥8 messages exchanged**.
- Photos: $2.99. Videos: $4.99. (Existing.)
- Bundles: $14.99 for 4-7 moments (escalation past 3 singles).
- Custom requests: $5–$25 per request.
- Pricing variance: ±15%, max once per moment per user.

### Persona dialog rule

The persona **never** mentions money, price, payment, subscription, or buying. Period. She says things like *"I want you to see this"* — the **card** handles the price/timer/CTA. Post-unlock, she reacts with intimacy and gratitude framed around the relationship, not the transaction.

---

## What's already built (use these, don't rebuild)

Existing files and what they do:

- **`lib/engine/vibe-engine.ts`** — daily mood picker (System 2). Function: `getOrGenerateDailyVibe`, `getVibePromptContext`. Persists to `persona_daily_vibes` table. Returns one of ~10 vibes per (user, persona, day).
- **`lib/engine/tension-engine.ts`** — push/event decision logic. `evaluatePremiumEvent` already gates on tension band, exchange count, cooldowns, and per-type cooldowns. Has a 25% realism-skip already wired.
- **`lib/engine/event-engine.ts`** — promotion/event scoring. `evaluateEventInjection` ranks active promotions by tension/quality/inactivity, applies probability gate.
- **`lib/engine/quality-engine.ts`** — `scoreMessage` returns `{ score, category, flags }` for each user message. Used by tension + anti-gaming.
- **`lib/engine/chemistry-engine.ts`** — session-scoped chemistry (visible tension reframed). Has `getSnapshot` and band thresholds.
- **`lib/engine/behavior-engine.ts`** — `buildBehaviorBrief` (System 7) fuses stage + vibe + chemistry into a single prompt fragment for Claude.
- **`lib/engine/anti-gaming-engine.ts`** — burst suppression, near-duplicate detection. Returns `xpMultiplier`, `gestureAllowed`, `rewardMomentumDamp`.
- **`lib/engine/relationship-engine.ts`** — XP, level-up walker, deduped reward delivery.
- **`lib/engine/gesture-engine.ts`** — surprise gesture eligibility (System 6). Free gift candidate path.
- **`types/promotions.ts`** — `Promotion` type already includes `bundleItems[]` (typed but not wired end-to-end).
- **Database**: `persona_daily_vibes`, `tension_state`, `tension_events`, `relationship_levels`, `surprise_gestures`, `vault_events`, `subscription_prompt_events`, `moments`, `moment_unlocks` — all exist.
- **UI**: `components/chat/PremiumMomentCard.tsx`, `MomentRevealModal.tsx`, `MediaShelf.tsx`, `PersonaHeader.tsx`, `MessageBubble.tsx`, `ChatInput.tsx` — shipped with current visual treatment (gold lightning photos, purple lightning videos via `/public/moment-cards.png`).

---

## What needs to be built (in this order)

### 1. Mood-crack scoring  ⭐ CORE

**New file:** `lib/engine/mood-crack-engine.ts`

For each user message, score how well it matches today's vibe.

- Inputs: today's vibe (from `vibe-engine`), the user's message, the recent conversation history, the quality score (from `quality-engine`).
- Output: `moodCrackScore` (0-100). Persist to `tension_state.session_metadata` as a rolling score that survives within a session (resets on new day).
- Method:
  - Each vibe has a set of "match signals" — keyword patterns, emotional tone, message length expectation. E.g. "missing_you" vibe rewards vulnerability + length; "playful" vibe rewards flirty + brevity + emojis.
  - Each user message scored against today's vibe's match signals.
  - Recent N (5) message scores averaged.
  - Score above 60 = "cracked"; below 40 = "missing"; in between = "warming".

**Files to modify:**
- `app/api/chat/route.ts` — call mood-crack scorer after quality-engine, before event-engine. Pass `moodCrackScore` to event-engine.
- `lib/engine/tension-engine.ts` — `evaluatePremiumEvent` already takes `SessionState`; extend to read `moodCrackScore` from session metadata.

### 2. Mood-aware offer gating

**Modify:** `lib/engine/event-engine.ts` and `lib/engine/tension-engine.ts`

- Hard gate: if `moodCrackScore < 60`, skip ALL paid event injection. Return `{ shouldInject: false, reason: "mood_not_cracked" }`.
- Soft scaling: when score is 60-80, normal probability. When 80+, slight boost (1.3× multiplier on probability).
- Weekly free gift bypasses the gate (it fires regardless).

### 3. Persona prompt lock

**Modify:** `app/api/chat/route.ts` (where the system prompt is built — search for the persona prompt construction; likely near the routed-Claude call).

Append explicit non-transactional rule to the system prompt:

```
ABSOLUTE RULES:
- You never mention money, price, cost, payment, subscription, "buy", "pay", "unlock for $", or any transactional language.
- You never reference the app, app features, tabs, buttons, or "premium content".
- When you have something to share with the user, you offer it as an emotional gift — say things like "I want you to see this" or "I made something for you" — never describe it as a product or commodity.
- Even if the user asks about prices or how to pay, you redirect with warmth: "you don't need to worry about that with me."
```

Audit any existing dialog fragments in `lib/engine/behavior-engine.ts` and persona seed data for transactional language — none should remain.

### 4. 2-minute timer card

**New component:** `components/chat/TimedOfferCard.tsx` or extend `PremiumMomentCard.tsx` with a `timerSeconds` prop.

- Card displays a thin progress bar that fills/depletes over 120 seconds.
- When timer expires, the card auto-dismisses (or shows a "missed it" empty state).
- The timer is a real client-side countdown — when it hits zero, the offer is gone for this user, this moment, this session. (Don't fake it.)
- Server: when an offer is created, set `expires_at` on the moment_offer row to NOW + 120s. The unlock endpoint rejects unlock attempts after expires_at.

**Files to modify:**
- `components/chat/PremiumMomentCard.tsx` — add optional timer UI.
- `app/api/moments/[id]/unlock/route.ts` (or wherever unlock lives) — check `expires_at` before allowing unlock.

### 5. Bundle escalation

**Modify:** `lib/engine/event-engine.ts`

- After a user has unlocked **3 singles in the current day** (or session, depending on tracking), the next eligible event picks `bundle_rail` over `media_teaser`.
- Bundle composition: pull 4-7 unowned moments from the persona's catalog, present at $14.99 flat (or 35% discount vs sum-of-singles, whichever is higher).
- New table: `moment_bundles` (id, persona_id, title, moment_ids[], price, created_at) — admin can curate or it can be auto-assembled.
- New UI: `BundleCard.tsx` showing "I made a few things for you..." + grid of blurred thumbnails + single CTA + price.

**Files:**
- New: `components/chat/BundleCard.tsx`
- New migration: `supabase/migrations/_bundles.sql`
- Modify: `lib/engine/event-engine.ts` (route to bundle when escalation conditions met)
- Modify: `app/api/moments/bundle/[id]/unlock/route.ts` (new endpoint)

### 6. Weekly free gift scheduler

**New file:** `lib/engine/weekly-gift-engine.ts`

- For each user × persona pair, schedule a free moment delivery on a randomized weekday (Mon–Sun) at a randomized hour.
- Storage: new table `weekly_gifts` (user_id, persona_id, scheduled_for timestamp, delivered_at, moment_id).
- Delivery: on each user message, check if scheduled_for ≤ NOW and delivered_at is null. If yes, mark delivered, push the moment as a free unlock (no card, no CTA, just appears in the user's library + a chat message from her: "thinking of you 💜 — here").
- Scheduling: on first session of a new week, generate next week's gift entry.

**Files:**
- New: `lib/engine/weekly-gift-engine.ts`
- New migration: `supabase/migrations/_weekly_gifts.sql`
- Modify: `app/api/chat/route.ts` (call weekly-gift check on each message)

### 7. $9.99 subscription wiring

**Existing partial:** `app/api/subscribe/`, `lib/engine/subscription-trigger.ts` (stubbed earned-trigger)

- Wire Stripe Checkout for the single $9.99/mo tier (price ID in env).
- Webhook handler at `app/api/stripe/webhook/route.ts` — update `profiles.subscription_status` on checkout.session.completed and customer.subscription.updated.
- Modify earned-subscription trigger to fire only when:
  - `mood_crack_score >= 70`
  - `chemistry_score >= 70`
  - `messages_this_session >= 8`
  - User is not currently subscribed
  - Anti-gaming penalty ≤ 0.3
- The trigger renders a popup card (already partly built) framed as "you've earned this."

**Files:**
- Modify: `lib/engine/subscription-trigger.ts`
- Modify: `app/api/stripe/webhook/route.ts`
- Modify: persona-side gating: subscriber bypasses daily message cap; subscriber gets ±15% pricing discount on offers; subscriber sees a different bubble color (small identity marker).

### 8. Custom request whale flow (last; biggest scope)

**New end-to-end:**

- Submission UI: subscriber-only entry point. User describes what they want (free text, ~200 chars). $5-25 quoted at submission based on type.
- Storage: `custom_requests` table (id, user_id, persona_id, prompt, status, quoted_price, delivered_moment_id).
- Creator review queue: simple admin page at `app/admin/custom-requests/page.tsx`. Creator approves, generates content offline, uploads, marks delivered.
- Delivery: when status flips to "delivered", surface in user's chat: "I made what you asked for 💜" + the moment.
- Payment: Stripe at submission time (held in escrow until delivery).

This is the biggest scope. Build it last after the rest is shipped and the funnel is proven.

---

## Critical files map

| Concern | File |
|---|---|
| Daily mood selection | `lib/engine/vibe-engine.ts` |
| Mood-match scoring (NEW) | `lib/engine/mood-crack-engine.ts` |
| Push decision logic | `lib/engine/tension-engine.ts` |
| Event/offer gating | `lib/engine/event-engine.ts` |
| Anti-gaming | `lib/engine/anti-gaming-engine.ts` |
| Quality scoring | `lib/engine/quality-engine.ts` |
| Behavior brief assembly | `lib/engine/behavior-engine.ts` |
| Subscription trigger | `lib/engine/subscription-trigger.ts` |
| Weekly gift (NEW) | `lib/engine/weekly-gift-engine.ts` |
| Chat API + system prompt | `app/api/chat/route.ts` |
| Stripe webhook | `app/api/stripe/webhook/route.ts` |
| In-chat moment offer card | `components/chat/PremiumMomentCard.tsx` |
| Reveal modal | `components/chat/MomentRevealModal.tsx` |
| Bundle card (NEW) | `components/chat/BundleCard.tsx` |
| Photos/Videos tabs | `components/chat/MediaShelf.tsx` |
| Database migrations | `supabase/migrations/` |

---

## Build order (recommended)

1. **Mood-crack scoring** — foundational; unblocks everything
2. **Mood-aware gating** — flips the dial that makes the whole thing work
3. **Persona prompt lock** — cheap, immediate brand protection
4. **2-min timer card** — first user-visible new feature
5. **Bundle escalation** — first revenue-multiplier
6. **Weekly free gift** — retention anchor
7. **$9.99 subscription wiring** — predictable MRR
8. **Custom request flow** — whale path

Ship 1-3 together as one PR. Ship 4-5 together. Ship 6 alone. Ship 7-8 separately as bigger pushes.

---

## Verification

End-to-end test for each phase:

**Phase 1-2 (mood-crack + gating):**
1. Manually set `persona_daily_vibes` for test user to a specific vibe (e.g. "playful").
2. Send 5 dry/off-vibe messages. Confirm `moodCrackScore` stays low and zero offers fire.
3. Send 5 in-tune messages (flirty, short, emoji-heavy for "playful"). Confirm score rises and offers eligible.
4. Confirm `tension_events` log shows `mood_crack_score` in metadata.

**Phase 3 (prompt lock):**
1. Use chat as test user.
2. Try to elicit transactional speech: "how much for an image?", "should I subscribe?".
3. Confirm Luna deflects without ever stating a price.

**Phase 4 (timer card):**
1. Trigger an offer.
2. Wait 130 seconds without unlocking.
3. Confirm unlock endpoint rejects with `expires_at` reason.

**Phase 5 (bundle):**
1. Unlock 3 singles in one session.
2. Confirm next push is a `BundleCard`.
3. Unlock bundle, confirm all moments delivered to user library.

**Phase 6 (weekly gift):**
1. Manually insert a `weekly_gifts` row with `scheduled_for` = NOW.
2. Send any chat message.
3. Confirm gift delivered as message + moment in library.

**Phase 7 (subscription):**
1. Engage to mood-crack 70+ and chemistry 70+ and 8+ messages.
2. Confirm subscription card surfaces with "you've earned this" framing.
3. Click through Stripe Checkout test mode.
4. Confirm `profiles.subscription_status = active` after webhook.

**Phase 8 (custom requests):**
1. As a subscribed user, submit request.
2. As admin, approve, upload moment.
3. Confirm delivery flows to user chat and library.

---

## How to resume in a new conversation

When you start a new Claude Code session in this project, paste this:

```
Read .claude/MONETIZATION_PLAN.md and CLAUDE.md, plus check the
last 5 git commits with `git log --oneline | head -5`. Pick up
from "What needs to be built" — recommended start is Phase 1
(mood-crack scoring) in lib/engine/mood-crack-engine.ts.
Don't rebuild anything in the "What's already built" section.
```

That gets future sessions back to context without re-litigating the strategy.

---

## Out of scope (don't build, don't propose)

- Multiple subscription tiers — single $9.99 only
- "Play broke/poor" persona scripts — explicitly rejected; wrong kind of manipulation
- Token/credit systems — adds cognitive load, hurts retention vs subscription
- Hard message-count paywalls — use soft slowdowns instead
- Aggressive popup interruptions — never block chat to sell
- Persona ever mentioning money, price, payment, or the app's commercial structure
