# ChatSpace — Profit Guarantee Analysis

**Goal:** Make every user mathematically profitable, without sacrificing
the quality of the moments that matter.

**Date:** 2026-05-08

---

## 1. What each user costs you, today

ChatSpace currently sends **every** user message through Claude Sonnet 4.6
with no prompt caching, no model routing, and a 30-message history window.

### Pricing (Anthropic, current)

| Model | Input ($/M tokens) | Output ($/M tokens) | Cache read | Notes |
|---|---|---|---|---|
| **Opus 4.7** | $15 | $75 | $1.50 | Premium reasoning. Overkill for chat. |
| **Sonnet 4.6** ← you use this | **$3** | **$15** | $0.30 | Quality flagship. |
| **Haiku 4.5** | $1 | $5 | $0.10 | 3× cheaper than Sonnet. Excellent at light chat. |

### Per-message math (today)

```
Input:   system prompt 800   + history 1,500   + new msg 50   =  2,350 tokens
Output:  ~200 tokens average (capped at 250)

Input cost  = 2,350 × $3   / 1,000,000  =  $0.00705
Output cost =   200 × $15  / 1,000,000  =  $0.00300
─────────────────────────────────────────────────────
TOTAL                                    ≈ $0.0100  per message
```

**Round number to remember: 1¢ per message, today.**

### Scale projections

| Usage pattern | Daily | Monthly |
|---|---|---|
| 1 user × 50 msgs/day | $0.50 | **$15** |
| 1 user × 100 msgs/day | $1.00 | **$30** |
| 1 user × 200 msgs/day | $2.00 | **$60** |
| 1,000 users × 100 msgs/day avg | $1,000 | **$30,000** |

---

## 2. Where the bleeding is

### Tier breakdown

| User type | Revenue/mo | Claude cost/mo | Net |
|---|---|---|---|
| Free user, 14 msgs then leaves | $0 | **$0.14 (loss)** | -$0.14 |
| Free user pays 1× continuation ($2) | $2 | $0.28 | **+$1.72** |
| Free user pays 5× continuations | $10 | $0.85 | **+$9.15** |
| Subscriber, 100 msgs/day | $9.99 | **$30** | **-$20.01** ⚠️ |
| Subscriber, 200 msgs/day | $9.99 | $60 | -$50.01 ⚠️ |

### Diagnosis

- **Free tier is fine.** Your $2 continuation already does the heavy
  lifting — every paid extension turns ~$0.14 of cost into ~$1.86 of
  profit. The leaving moment IS your cost-control.
- **Continuations are pure margin.** $1.99 covers 199 messages of cost.
  These are gold.
- **Moments / bundles are nearly 100% margin.** A $2.99 photo unlock or
  $14.99 bundle costs you ~$0.001 extra in Claude (a single small
  Claude call to react to the unlock). These are how you actually make money.
- **Subscribers are exposed.** $9.99/mo only covers ~33 free messages
  a day at current cost. Every message above that is a loss. Heavy
  chatters are where the bleeding happens.

**You don't have a free-tier problem. You have a subscriber-API problem.**

---

## 3. Should you switch models?

**Short answer: Yes — but selectively. Keep Sonnet for moments that matter,
swap to Haiku for low-stakes warming-up chat.**

### Side-by-side — what each model is best at

| Scenario | Best model | Why |
|---|---|---|
| Hi / how was your day / small talk | Haiku 4.5 | Cheap, perfectly natural, indistinguishable |
| Flirty banter | Haiku 4.5 | Holds tone fine, especially with your style prompt |
| Vulnerability / emotional peaks | Sonnet 4.6 | Better nuance, longer-range coherence |
| Continue-chat resolution lines | Sonnet 4.6 | One-shot, in-character, payment context — quality matters |
| Multi-media intro ("wait there's more 😭") | Sonnet 4.6 | Higher value moment, worth the spend |
| Subscription pitch dialogue | Sonnet 4.6 | Conversion-critical |

### Routing signal — already in your code

`lib/engine/tension-engine.ts` already classifies every turn into:
- `warming_up` (low momentum, small talk) — ~50–60% of turns
- `image_zone` (vibing) — ~20%
- `premium_zone` (heating up) — ~15%
- `video_zone` (peak emotional moment) — ~5–10%

**Recommendation:** Route `warming_up` to Haiku 4.5. Keep everything
else on Sonnet 4.6. You get ~3× cost savings on the cheapest half of
your turns, and **zero quality drop on the moments that drive
revenue** (because those still use Sonnet).

### Don't take this on faith — the 10-minute A/B test

1. Pull 5 real conversations from your `messages` table where the
   `tension_band` was `warming_up` for the user message.
2. Re-render the AI reply with Haiku 4.5 using your existing system
   prompt (no other changes).
3. Print Sonnet response and Haiku response side-by-side, blind.
4. If you can't reliably guess which is which → ship Haiku for the
   `warming_up` band.

This is the only thing standing between you and a 40% cost reduction.

### Important: do NOT use Haiku for these

- Moments/media reactions (post-unlock dialogue)
- Continuation resolution lines
- Anything in `premium_zone` / `video_zone`
- Subscription-eligible categories (the
  `EMOTIONAL_INEXPERIENCE_VULNERABILITY` category in your engine)

These are revenue-critical. The $0.007 you'd save isn't worth even a
1% conversion drop.

---

## 4. The Profit Guarantee Formula

Stacked, in order of biggest impact.

### Lever 1 — Hybrid model routing (Haiku for warming_up)
**Savings: ~40% of total Claude spend**
- Effort: ~3 hours
- Risk: low (you'll A/B test it first)
- Quality: preserved on all revenue moments

### Lever 2 — Anthropic prompt caching
**Savings: ~25% on top of Lever 1**
- Effort: ~1 hour
- Risk: very low (Anthropic-supported, just a flag)
- How: mark the static head of your system prompt (persona traits, rules)
  with `cache_control: { type: "ephemeral" }`. Cache reads cost 90% less.

### Lever 3 — Trim history window 30 → 12
**Savings: ~15% input tokens**
- Effort: 1 line in `app/api/chat/route.ts:94`
- Risk: very low (Claude rarely needs >10 messages of context)
- Quality: imperceptible. Memory engine + behavior brief carry the long-range stuff.

### Lever 4 — Per-user daily cap (the actual guarantee)
**The structural guarantee. This is what stops a single user from
ever costing more than they pay.**
- Free users: ~20 messages/day (then $2 continuation kicks in)
- Subscribers: ~150 messages/day (then "getting sleepy 💜 talk tomorrow")
- The cap is invisible — the girl naturally winds down using your
  existing leaving-logic system. Reset at midnight.

This single change converts subscribers from "unlimited chat" (a
financial liability) to "lots of chat" (a profitable product).

### Lever 5 — Already in place: prewritten response router
Your `lib/engine/response-router.ts` already serves some turns from
your phrase bank with **zero Claude cost**. Worth measuring its
hit-rate — every 10% bump = ~10% total savings, free.

---

## 5. Worked example — a heavy subscriber

100 messages/day × 30 days = 3,000 messages/mo. $9.99 subscription.

| Setup | Claude cost/mo | Net (vs $9.99 sub) |
|---|---|---|
| **Today** (Sonnet only, no cache, 30-msg history) | **$30.00** | -$20.01 ⚠️ |
| + Lever 1: Haiku for warming_up (50%) | $19.50 | -$9.51 |
| + Lever 2: prompt caching | $14.65 | -$4.66 |
| + Lever 3: trim history 30→12 | $10.20 | **-$0.21 (basically even)** |
| + Lever 4: cap @ 75 msgs/day | **$7.65** | **+$2.34 ✅** |

After all four levers:
- Heavy subscriber goes from **$20/mo loss** to **$2.34/mo profit** on chat alone.
- Then add their moment unlocks ($2.99 each, ~95% margin), continuations
  ($1.99 each, ~95% margin), and bundles ($14.99, ~99% margin) — all near-pure
  profit on top.

**This is your business model in one paragraph:**
> The $9.99 sub gets the user in the door at break-even.
> The moments and continuations are where the actual money is made.
> The cap and the model routing make sure no single user can blow up the unit economics.

---

## 6. What NOT to do

- **Don't paywall message 1.** Free preview is your best conversion
  driver. Killing it would tank funnel conversion by likely 70%+.
  $0.14 of Claude cost per non-converting lead is cheap acquisition.
- **Don't use Opus for chat.** It's 5× more expensive than Sonnet
  with no perceptible quality gain on conversational text. Reserve
  Opus for one-time generation tasks (custom request fulfillment, etc.)
  if you ever need it.
- **Don't shrink the system prompt aggressively.** Most of it is
  personality and the absolute non-transactional rule — both
  load-bearing. Caching solves this without cutting quality.
- **Don't remove the leaving moment.** It's already saving you money
  on free users. Keep it; just make the resolution feel natural
  (which the latest commit already does).

---

## 7. Hidden levers worth knowing

- **Token-usage logging.** Right now you can't see actual costs per
  user/day because Anthropic's `usage.input_tokens` and
  `usage.output_tokens` aren't being persisted. Adding a `claude_usage_events`
  table (1 hour of work) would let you see who your $30/mo subscribers
  actually are, in real time. Highly recommended before pulling levers.
- **Output-cap tuning.** You cap at 250. If logging shows average actual
  output is 130, dropping the cap to 180 is a free 5–8% saving with zero
  quality risk.
- **Prewritten phrase bank.** You have 49 active phrases per persona.
  Adding more high-quality phrases for common openers/closers can let
  the router serve more turns at $0 cost.

---

## 8. Recommended ship order

If you want to stop bleeding tomorrow, in this order:

1. **Add per-user daily cap** (Lever 4) — biggest structural protection, smallest code change. Stops the worst-case subscriber from being a runaway liability.
2. **Add prompt caching** (Lever 2) — cheapest implementation, ~25% savings, zero quality risk.
3. **Add token-usage logging** — so you can measure everything else.
4. **Run the 10-minute Haiku A/B test.** If it passes, ship hybrid routing (Lever 1).
5. **Trim history** (Lever 3) — last because it's the smallest gain.

Each of these is a 1–3 hour follow-up I can execute when you give the
green light.

---

## TL;DR

- **Today: 1¢ per Claude message. Heavy subscribers cost $20–50/mo.**
- **Don't paywall first message.** Your $2 continuation already protects free tier.
- **Use Haiku 4.5 for warming-up chat, Sonnet 4.6 for moments.** ~40% savings, no quality loss on what matters.
- **Add a daily message cap.** This is the actual profit guarantee.
- **Subscription is a hook. Real money is in moments + continuations + bundles** (95–99% margin each).
- **Stack the four levers and a heavy 100-msg/day subscriber goes from $20/mo loss to $2.34/mo profit.**
