import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tension?personaId=xxx — Get current tension state
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const personaId = request.nextUrl.searchParams.get("personaId");
  if (!personaId) return NextResponse.json({ error: "Missing personaId" }, { status: 400 });

  const { data: tension } = await supabase
    .from("tension_state")
    .select("*")
    .eq("user_id", user.id)
    .eq("persona_id", personaId)
    .single();

  if (!tension) {
    return NextResponse.json({
      tension: {
        score: 0,
        band: "warming_up",
        streak: 0,
        peakScore: 0,
        rewardsThisSession: 0,
        sessionMessageCount: 0,
      },
    });
  }

  return NextResponse.json({
    tension: {
      score: Number(tension.score),
      band: tension.current_band,
      streak: tension.daily_streak,
      peakScore: Number(tension.peak_score),
      rewardsThisSession: tension.rewards_this_session,
      sessionMessageCount: tension.session_message_count,
    },
  });
}
