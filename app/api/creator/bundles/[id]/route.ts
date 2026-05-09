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
  const updates = await request.json();
  const moment_ids = updates.moment_ids;
  delete updates.id;
  delete updates.moment_ids;
  delete updates.created_at;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("moment_bundles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace items if provided
  if (Array.isArray(moment_ids)) {
    await admin.from("moment_bundle_items").delete().eq("bundle_id", id);
    if (moment_ids.length > 0) {
      await admin.from("moment_bundle_items").insert(
        moment_ids.map((mid: string, i: number) => ({
          bundle_id: id,
          moment_id: mid,
          sort_order: (i + 1) * 10,
        })),
      );
    }
  }

  return NextResponse.json({ bundle: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("moment_bundles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
