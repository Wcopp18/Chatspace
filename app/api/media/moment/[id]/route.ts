import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveMediaUrl } from "@/lib/media/signed-urls";

/**
 * GET /api/media/moment/[id]
 *
 * Returns a short-lived signed URL for an unlocked moment's media,
 * gated by a `moment_unlocks` ownership check. Legacy full URLs are
 * passed through as-is.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: moment } = await supabase
      .from("moments")
      .select("id, media_url")
      .eq("id", id)
      .single() as { data: { id: string; media_url: string | null } | null };
    if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: unlock } = await supabase
      .from("moment_unlocks")
      .select("id")
      .eq("user_id", user.id)
      .eq("moment_id", id)
      .maybeSingle();
    if (!unlock) return NextResponse.json({ error: "Not unlocked" }, { status: 403 });

    const url = await resolveMediaUrl(supabase, "moments", moment.media_url);
    if (!url) return NextResponse.json({ error: "Media unavailable" }, { status: 404 });

    return NextResponse.json({ url });
  } catch (e) {
    console.error("Moment media error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
