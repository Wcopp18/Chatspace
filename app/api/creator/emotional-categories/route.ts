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

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [{ data: categories }, { data: examples }] = await Promise.all([
    admin.from("emotional_categories").select("*").order("sort_order"),
    admin.from("emotional_category_examples").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return NextResponse.json({
    categories: categories || [],
    examples: examples || [],
  });
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { internal_key, display_name, description, duplicate_from } = body;

  if (!internal_key?.trim() || !display_name?.trim()) {
    return NextResponse.json({ error: "internal_key and display_name required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get max sort_order
  const { data: maxSort } = await admin
    .from("emotional_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSort = (maxSort?.sort_order || 0) + 10;

  let insertData: Record<string, unknown> = {
    internal_key: internal_key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
    display_name: display_name.trim(),
    description: description?.trim() || "",
    sort_order: nextSort,
  };

  // If duplicating, copy fields from source
  if (duplicate_from) {
    const { data: src } = await admin
      .from("emotional_categories")
      .select("*")
      .eq("id", duplicate_from)
      .single();
    if (src) {
      const { id: _id, internal_key: _ik, display_name: _dn, created_at: _ca, updated_at: _ua, ...rest } = src;
      insertData = { ...rest, ...insertData };
    }
  }

  const { data, error } = await admin
    .from("emotional_categories")
    .insert(insertData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Copy example lines if duplicating
  if (duplicate_from && data) {
    const { data: srcExamples } = await admin
      .from("emotional_category_examples")
      .select("line, sort_order")
      .eq("category_id", duplicate_from)
      .eq("is_active", true);
    if (srcExamples && srcExamples.length > 0) {
      await admin.from("emotional_category_examples").insert(
        srcExamples.map((e: { line: string; sort_order: number }) => ({
          category_id: data.id,
          line: e.line,
          sort_order: e.sort_order,
        })),
      );
    }
  }

  return NextResponse.json({ category: data });
}
