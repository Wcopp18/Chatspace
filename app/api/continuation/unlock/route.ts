import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PRICING } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, promptId } = await request.json();

  // MVP: Simulate payment
  await supabase.from("continuation_unlocks").insert({
    user_id: user.id,
    conversation_id: conversationId,
    prompt_id: promptId,
    amount_paid: PRICING.EMOTIONAL_CONTINUATION,
    stripe_payment_id: `mock_cont_${Date.now()}`,
  });

  // Update conversation to record last continuation
  await supabase
    .from("conversations")
    .update({ last_continuation_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ success: true });
}
