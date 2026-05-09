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

interface Params { params: Promise<{ personaId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { personaId } = await params;
  const admin = createAdminClient();

  const { data: rewards } = await admin
    .from("streak_rewards")
    .select("*, moments(id, title, thumbnail_url, media_type)")
    .eq("persona_id", personaId)
    .order("day_milestone");

  const { data: moments } = await admin
    .from("moments")
    .select("id, title, thumbnail_url, media_type, price, is_active")
    .eq("persona_id", personaId)
    .eq("is_active", true)
    .order("sort_order");

  return NextResponse.json({ rewards: rewards || [], moments: moments || [] });
}

/**
 * PUT body:
 *   { rewards: [{ day_milestone, moment_id, intro_line, intro_mode, is_active }, ...] }
 *
 * Upserts the whole set for this persona.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { personaId } = await params;
  const body = await request.json();
  if (!Array.isArray(body.rewards)) {
    return NextResponse.json({ error: "rewards array required" }, { status: 400 });
  }

  const admin = createAdminClient();

  for (const r of body.rewards) {
    if (typeof r.day_milestone !== "number") continue;
    const { error } = await admin
      .from("streak_rewards")
      .upsert(
        {
          persona_id: personaId,
          day_milestone: r.day_milestone,
          moment_id: r.moment_id || null,
          intro_line: r.intro_line || "",
          intro_mode: r.intro_mode || "paraphrase",
          is_active: r.is_active ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "persona_id,day_milestone" },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
