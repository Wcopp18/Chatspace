import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  return profile?.is_admin ? user : null;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/creator/levels/[id]
 * Update a relationship level
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("relationship_levels")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ level: data });
}

/**
 * DELETE /api/creator/levels/[id]
 * Soft-delete a relationship level
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin
    .from("relationship_levels")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
