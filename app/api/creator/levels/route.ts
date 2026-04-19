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

export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const personaId = request.nextUrl.searchParams.get("persona_id");
  if (!personaId) return NextResponse.json({ error: "persona_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: levels, error } = await admin
    .from("relationship_levels")
    .select("*")
    .eq("persona_id", personaId)
    .order("level_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const levelIds = (levels || []).map((l: { id: string }) => l.id);
  const { data: rewards } = levelIds.length > 0
    ? await admin
        .from("relationship_level_rewards")
        .select("*")
        .in("level_id", levelIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  return NextResponse.json({ levels: levels || [], rewards: rewards || [] });
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { persona_id, level_number, name, description, xp_to_complete, color, icon } = body;

  if (!persona_id || !name || !level_number || !xp_to_complete) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("relationship_levels")
    .insert({
      persona_id,
      level_number,
      name,
      description: description ?? null,
      xp_to_complete,
      color: color ?? "#8B5CF6",
      icon: icon ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ level: data });
}
