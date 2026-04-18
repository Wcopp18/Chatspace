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

/**
 * GET /api/creator/levels?personaId=xxx
 * List all relationship levels for a persona
 */
export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const personaId = request.nextUrl.searchParams.get("personaId");
  if (!personaId) return NextResponse.json({ error: "Missing personaId" }, { status: 400 });

  const admin = createAdminClient();
  const { data: levels, error } = await admin
    .from("relationship_levels")
    .select("*, relationship_level_rewards(*)")
    .eq("persona_id", personaId)
    .order("level_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ levels: levels || [] });
}

/**
 * POST /api/creator/levels
 * Create a new relationship level for a persona
 */
export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { persona_id, level_number, level_name, xp_required, description, color_hex, icon } = body;

  if (!persona_id || !level_number || !level_name || xp_required == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("relationship_levels")
    .insert({
      persona_id,
      level_number,
      level_name,
      xp_required,
      description: description || null,
      color_hex: color_hex || "#8B5CF6",
      icon: icon || null,
      is_active: true,
      sort_order: level_number,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ level: data });
}
