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

export async function POST(request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: categoryId } = await params;
  const { line, sort_order } = await request.json();
  if (!line?.trim()) return NextResponse.json({ error: "line required" }, { status: 400 });

  const admin = createAdminClient();

  // Determine next sort order if not given
  let order = sort_order;
  if (typeof order !== "number") {
    const { data: max } = await admin
      .from("emotional_category_examples")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    order = (max?.sort_order || 0) + 10;
  }

  const { data, error } = await admin
    .from("emotional_category_examples")
    .insert({ category_id: categoryId, line: line.trim(), sort_order: order })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ example: data });
}

export async function PATCH(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { id, line, sort_order, is_active } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (typeof line === "string") updates.line = line;
  if (typeof sort_order === "number") updates.sort_order = sort_order;
  if (typeof is_active === "boolean") updates.is_active = is_active;

  const { data, error } = await admin
    .from("emotional_category_examples")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ example: data });
}

export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("emotional_category_examples").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
