/**
 * Analytics endpoint — counts and aggregates emotional engine events.
 * Returns last-30-day totals per category for a single persona.
 */

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
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await admin
    .from("emotional_category_events")
    .select("category_key, was_blocked, block_reason, created_at, monetization_type")
    .eq("persona_id", personaId)
    .gte("created_at", since);

  const byCategory = new Map<string, { fires: number; blocks: number; monetizationFires: number }>();
  const blockReasons = new Map<string, number>();
  let totalFires = 0;
  let totalBlocks = 0;

  for (const e of (events || []) as { category_key: string; was_blocked: boolean; block_reason: string | null; monetization_type: string | null }[]) {
    if (e.was_blocked) {
      totalBlocks++;
      const r = e.block_reason || "unknown";
      blockReasons.set(r, (blockReasons.get(r) || 0) + 1);
      continue;
    }
    totalFires++;
    const stat = byCategory.get(e.category_key) || { fires: 0, blocks: 0, monetizationFires: 0 };
    stat.fires++;
    if (e.monetization_type) stat.monetizationFires++;
    byCategory.set(e.category_key, stat);
  }

  return NextResponse.json({
    sinceIso: since,
    totalFires,
    totalBlocks,
    byCategory: Array.from(byCategory.entries()).map(([key, v]) => ({ key, ...v })),
    blockReasons: Array.from(blockReasons.entries()).map(([reason, count]) => ({ reason, count })),
  });
}
