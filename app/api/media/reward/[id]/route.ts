import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveMediaUrl } from "@/lib/media/signed-urls";

/**
 * GET /api/media/reward/[id]
 *
 * Returns a short-lived signed URL for a claimed relationship-level
 * reward's media, gated by `user_level_reward_claims` ownership.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: reward } = await supabase
      .from("relationship_level_rewards")
      .select("id, media_url")
      .eq("id", id)
      .single() as { data: { id: string; media_url: string | null } | null };
    if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: claim } = await supabase
      .from("user_level_reward_claims")
      .select("id")
      .eq("user_id", user.id)
      .eq("reward_id", id)
      .maybeSingle();
    if (!claim) return NextResponse.json({ error: "Not claimed" }, { status: 403 });

    const url = await resolveMediaUrl(supabase, "level-rewards", reward.media_url);
    if (!url) return NextResponse.json({ error: "Media unavailable" }, { status: 404 });

    return NextResponse.json({ url });
  } catch (e) {
    console.error("Reward media error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
