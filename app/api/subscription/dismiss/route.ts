import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordPromptEvent, FIRST_REVEAL_THRESHOLDS } from "@/lib/engine";

/**
 * POST /api/subscription/dismiss
 *
 * Records the dismissal event and sets a cooldown so the prompt doesn't
 * re-fire immediately on the next qualifying message.
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

    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + FIRST_REVEAL_THRESHOLDS.dismissCooldownHours);

    await supabase.from("profiles").update({
      subscription_dismissed_until: cooldownUntil.toISOString(),
    }).eq("id", user.id);

    await recordPromptEvent(supabase, {
      userId: user.id,
      personaId,
      conversationId: conversationId ?? null,
      eventType: "dismiss",
      chemistryScore,
      tensionScore,
      relationshipMomentum,
      context: { cooldown_until: cooldownUntil.toISOString() },
    });

    return NextResponse.json({ success: true, cooldownUntil: cooldownUntil.toISOString() });
  } catch (error) {
    console.error("Dismiss error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
