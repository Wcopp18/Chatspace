import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET  /api/custom-requests/[id] — Get a single custom request
 * PATCH /api/custom-requests/[id] — Update request status (admin only)
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("custom_requests")
    .select("*, personas(display_name, slug, avatar_url)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ request: data });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status, adminNotes, rejectionReason, pricingTier, price, deliveryTeaserLine } = body;

  const admin = createAdminClient();
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) updateData.status = status;
  if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
  if (rejectionReason !== undefined) updateData.rejection_reason = rejectionReason;
  if (pricingTier) updateData.pricing_tier = pricingTier;
  if (price !== undefined) updateData.price = price;
  if (deliveryTeaserLine) updateData.delivery_teaser_line = deliveryTeaserLine;

  // Set timestamps based on status
  if (status === "approved") updateData.approved_at = new Date().toISOString();
  if (status === "completed") updateData.completed_at = new Date().toISOString();
  if (status === "delivered") updateData.delivered_at = new Date().toISOString();

  const { data, error } = await admin
    .from("custom_requests")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update custom request error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: data });
}
