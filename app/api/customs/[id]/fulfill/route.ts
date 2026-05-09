/**
 * Fulfill a custom request. Admin uploads a moment, then marks the request
 * delivered. The chat surface picks up delivered requests on next session
 * and posts the in-character "I made what you asked for" message.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, admin_notes, rejection_reason, delivered_moment_id, delivery_teaser_line } = body;

  const admin = createAdminClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (status) updates.status = status;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;
  if (rejection_reason !== undefined) updates.rejection_reason = rejection_reason;
  if (delivered_moment_id !== undefined) updates.delivered_moment_id = delivered_moment_id;
  if (delivery_teaser_line !== undefined) updates.delivery_teaser_line = delivery_teaser_line;
  if (status === "approved") updates.approved_at = new Date().toISOString();
  if (status === "completed") updates.completed_at = new Date().toISOString();
  if (status === "delivered") updates.delivered_at = new Date().toISOString();

  const { data, error } = await admin
    .from("custom_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}
