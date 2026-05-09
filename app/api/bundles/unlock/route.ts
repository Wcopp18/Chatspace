/**
 * Unlock a bundle. MVP: simulated payment (mirrors moments/unlock pattern).
 * Records the unlock and returns the bundle items so the chat can drip them.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bundleId, conversationId } = await request.json();
  if (!bundleId) {
    return NextResponse.json({ error: "bundleId required" }, { status: 400 });
  }

  // Fetch bundle
  const { data: bundle } = await supabase
    .from("moment_bundles")
    .select("id, price, persona_id, title")
    .eq("id", bundleId)
    .eq("is_active", true)
    .single();

  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  // Mock payment record
  await supabase.from("moment_bundle_unlocks").insert({
    user_id: user.id,
    bundle_id: bundleId,
    conversation_id: conversationId || null,
    amount_paid: bundle.price,
    stripe_payment_id: `mock_bundle_${Date.now()}`,
  });

  // Return items so the UI can drip them in chat with their per-item lines
  const { data: items } = await supabase
    .from("moment_bundle_items")
    .select("id, sort_order, drip_message, moments(id, title, media_type, media_url, thumbnail_url)")
    .eq("bundle_id", bundleId)
    .order("sort_order");

  return NextResponse.json({
    success: true,
    bundle: {
      id: bundle.id,
      title: bundle.title,
      price: bundle.price,
    },
    items: items || [],
  });
}
