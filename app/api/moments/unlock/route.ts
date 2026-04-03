import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PRICING } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { momentId } = await request.json();

  // Get moment
  const { data: moment } = await supabase
    .from("moments")
    .select("*")
    .eq("id", momentId)
    .single();

  if (!moment) return NextResponse.json({ error: "Moment not found" }, { status: 404 });

  // Check if already unlocked
  const { data: existing } = await supabase
    .from("moment_unlocks")
    .select("id")
    .eq("user_id", user.id)
    .eq("moment_id", momentId)
    .single();

  if (existing) {
    return NextResponse.json({ success: true, alreadyUnlocked: true });
  }

  // MVP: Simulate unlock (no real Stripe in MVP)
  const price = moment.media_type === "video" ? PRICING.VIDEO_UNLOCK : PRICING.IMAGE_UNLOCK;

  await supabase.from("moment_unlocks").insert({
    user_id: user.id,
    moment_id: momentId,
    amount_paid: price,
    stripe_payment_id: `mock_${Date.now()}`,
  });

  return NextResponse.json({ success: true, price });
}
