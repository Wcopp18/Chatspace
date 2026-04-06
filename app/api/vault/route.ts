import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/vault?personaId=xxx — Get active vault events and their moments
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const personaId = request.nextUrl.searchParams.get("personaId");
  const now = new Date().toISOString();

  // Build query
  let query = supabase
    .from("vault_events")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("ends_at", { ascending: true });

  if (personaId) {
    query = query.eq("persona_id", personaId);
  }

  const { data: events } = await query;

  if (!events || events.length === 0) {
    return NextResponse.json({ events: [], moments: [] });
  }

  // Get moments linked to active vault events
  const eventIds = events.map(e => e.id);
  const { data: moments } = await supabase
    .from("moments")
    .select("*")
    .in("vault_event_id", eventIds)
    .eq("is_active", true);

  // Check unlocks
  const momentIds = (moments || []).map(m => m.id);
  const { data: unlocks } = momentIds.length > 0
    ? await supabase
        .from("moment_unlocks")
        .select("moment_id")
        .eq("user_id", user.id)
        .in("moment_id", momentIds)
    : { data: [] };

  const unlockedIds = new Set((unlocks || []).map(u => u.moment_id));

  return NextResponse.json({
    events: events.map(e => ({
      ...e,
      timeRemaining: new Date(e.ends_at).getTime() - Date.now(),
    })),
    moments: (moments || []).map(m => ({
      ...m,
      unlocked: unlockedIds.has(m.id),
    })),
  });
}
