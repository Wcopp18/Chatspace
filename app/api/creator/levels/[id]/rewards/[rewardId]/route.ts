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
  params: Promise<{ id: string; rewardId: string }>;
}

/**
 * DELETE /api/creator/levels/[id]/rewards/[rewardId]
 * Soft-delete a level reward
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rewardId } = await params;

  const admin = createAdminClient();
  const { error } = await admin
    .from("relationship_level_rewards")
    .update({ is_active: false })
    .eq("id", rewardId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
