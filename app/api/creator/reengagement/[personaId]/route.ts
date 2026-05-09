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

const DEFAULTS = {
  enabled: true,
  vulnerability_level: 6,
  min_silence_hours: 48,
  max_per_48h: 1,
  max_per_week: 3,
  fallback_line: "okay I'm trying not to be that girl but it's been a few days",
  require_memory: true,
  tone: "soft_vulnerable",
};

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { personaId } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("reengagement_settings")
    .select("*")
    .eq("persona_id", personaId)
    .maybeSingle();

  return NextResponse.json({
    settings: data || { persona_id: personaId, ...DEFAULTS },
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { personaId } = await params;
  const updates = await request.json();
  const admin = createAdminClient();

  const { error } = await admin
    .from("reengagement_settings")
    .upsert(
      {
        persona_id: personaId,
        enabled: updates.enabled ?? DEFAULTS.enabled,
        vulnerability_level: updates.vulnerability_level ?? DEFAULTS.vulnerability_level,
        min_silence_hours: updates.min_silence_hours ?? DEFAULTS.min_silence_hours,
        max_per_48h: updates.max_per_48h ?? DEFAULTS.max_per_48h,
        max_per_week: updates.max_per_week ?? DEFAULTS.max_per_week,
        fallback_line: updates.fallback_line ?? DEFAULTS.fallback_line,
        require_memory: updates.require_memory ?? DEFAULTS.require_memory,
        tone: updates.tone ?? DEFAULTS.tone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "persona_id" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
