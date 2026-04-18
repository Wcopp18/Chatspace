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
 * GET /api/creator/levels/[id]/rewards
 * List rewards for a relationship level
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const admin = createAdminClient();
  const { data: rewards, error } = await admin
    .from("relationship_level_rewards")
    .select("*")
    .eq("level_id", id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rewards: rewards || [] });
}

/**
 * POST /api/creator/levels/[id]/rewards
 * Create a reward for a relationship level
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: levelId } = await params;
  const body = await request.json();
  const { persona_id, media_type, caption } = body;

  if (!persona_id || !media_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("relationship_level_rewards")
    .insert({
      level_id: levelId,
      persona_id,
      media_type,
      caption: caption || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reward: data });
}
