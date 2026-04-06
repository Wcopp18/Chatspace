import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/milestones — Get user's milestone progress
 */

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all milestones and user's progress
  const [{ data: milestones }, { data: userMilestones }] = await Promise.all([
    supabase
      .from("milestones")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("user_milestones")
      .select("*, milestones(*)")
      .eq("user_id", user.id),
  ]);

  const unlockedIds = new Set((userMilestones || []).map(um => um.milestone_id));

  const result = (milestones || []).map(m => ({
    ...m,
    unlocked: unlockedIds.has(m.id),
    unlockedAt: (userMilestones || []).find(um => um.milestone_id === m.id)?.unlocked_at || null,
    rewardClaimed: (userMilestones || []).find(um => um.milestone_id === m.id)?.reward_claimed || false,
  }));

  return NextResponse.json({ milestones: result });
}
