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

export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const personaId = request.nextUrl.searchParams.get("personaId");
  const admin = createAdminClient();
  let q = admin.from("moment_bundles").select("*").order("sort_order");
  if (personaId) q = q.eq("persona_id", personaId);
  const { data: bundles } = await q;

  // Pull items in one go
  const bundleIds = (bundles || []).map((b: { id: string }) => b.id);
  const { data: items } = bundleIds.length > 0
    ? await admin
        .from("moment_bundle_items")
        .select("*, moments(id, title, thumbnail_url, media_type, price)")
        .in("bundle_id", bundleIds)
        .order("sort_order")
    : { data: [] };

  return NextResponse.json({ bundles: bundles || [], items: items || [] });
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { persona_id, title, intro_line, intro_mode, price, moment_ids } = body;
  if (!persona_id || !title) {
    return NextResponse.json({ error: "persona_id and title required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: bundle, error } = await admin
    .from("moment_bundles")
    .insert({
      persona_id,
      title,
      intro_line: intro_line || "",
      intro_mode: intro_mode || "paraphrase",
      price: price ?? 9.99,
    })
    .select()
    .single();

  if (error || !bundle) return NextResponse.json({ error: error?.message || "insert failed" }, { status: 500 });

  if (Array.isArray(moment_ids) && moment_ids.length > 0) {
    const rows = moment_ids.map((mid: string, i: number) => ({
      bundle_id: bundle.id,
      moment_id: mid,
      sort_order: (i + 1) * 10,
    }));
    await admin.from("moment_bundle_items").insert(rows);
  }

  return NextResponse.json({ bundle });
}
