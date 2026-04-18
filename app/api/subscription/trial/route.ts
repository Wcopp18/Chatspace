import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordPromptEvent } from "@/lib/engine";

/**
 * POST /api/subscription/trial
 *
 * Starts a subscription trial after the user clicks the "Start Free Trial"
 * CTA on the first-reveal popup. Records analytics events and marks the
 * user subscribed.
 *
 * TODO(stripe): Replace the direct `profiles.is_subscribed` flip with a
 * Stripe Checkout session + webhook flow. The webhook should set
 * `subscriptions.status = 'active'` and `profiles.is_subscribed = true`
 * only after successful payment. Until then this endpoint mock-subscribes
 * so the reveal UX is testable end-to-end.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { personaId, conversationId, chemistryScore, tensionScore, relationshipMomentum } = body as {
      personaId?: string;
      conversationId?: string | null;
      chemistryScore?: number;
      tensionScore?: number;
      relationshipMomentum?: number;
    };

    if (!personaId) {
      return NextResponse.json({ error: "Missing personaId" }, { status: 400 });
    }

    // Record click + trial_start so the funnel is attributable
    await recordPromptEvent(supabase, {
      userId: user.id,
      personaId,
      conversationId: conversationId ?? null,
      eventType: "click",
      chemistryScore,
      tensionScore,
      relationshipMomentum,
    });
    await recordPromptEvent(supabase, {
      userId: user.id,
      personaId,
      conversationId: conversationId ?? null,
      eventType: "trial_start",
      chemistryScore,
      tensionScore,
      relationshipMomentum,
      context: { trial_days: 30 },
    });

    // TODO(stripe): call stripe.checkout.sessions.create({...}) and return
    // the checkout URL for the client to redirect. Wait for the
    // `checkout.session.completed` webhook before flipping is_subscribed.
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

    await supabase.from("profiles").update({
      is_subscribed: true,
      subscription_expires_at: trialExpiresAt.toISOString(),
      subscription_dismissed_until: null,
    }).eq("id", user.id);

    await supabase.from("subscriptions").upsert({
      user_id: user.id,
      stripe_subscription_id: `mock_trial_${user.id}_${Date.now()}`,
      status: "trialing",
      current_period_end: trialExpiresAt.toISOString(),
    }, { onConflict: "user_id" });

    await recordPromptEvent(supabase, {
      userId: user.id,
      personaId,
      conversationId: conversationId ?? null,
      eventType: "reveal",
      chemistryScore,
      tensionScore,
      relationshipMomentum,
    });

    return NextResponse.json({
      success: true,
      subscribed: true,
      trialExpiresAt: trialExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Trial start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
