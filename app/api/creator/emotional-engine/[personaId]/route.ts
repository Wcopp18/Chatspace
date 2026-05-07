/**
 * Per-girl emotional engine config — bundle endpoint.
 *
 * GET  → returns signal weights, persona settings, and category overrides
 *        for a single persona.
 * PUT  → upsert any subset (settings | weights | overrides).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EMOTIONAL_SETTINGS } from "@/lib/engine/emotional-engine";

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

  const [settingsRes, weightsRes, overridesRes, globalWeightsRes] = await Promise.all([
    admin.from("emotional_persona_settings").select("*").eq("persona_id", personaId).maybeSingle(),
    admin.from("emotional_signal_weights").select("*").eq("persona_id", personaId),
    admin.from("emotional_category_overrides").select("*").eq("persona_id", personaId),
    admin.from("emotional_signal_weights").select("*").is("persona_id", null),
  ]);

  return NextResponse.json({
    settings: settingsRes.data || { persona_id: personaId, ...DEFAULT_EMOTIONAL_SETTINGS },
    weights: weightsRes.data || [],
    overrides: overridesRes.data || [],
    globalWeights: globalWeightsRes.data || [],
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { personaId } = await params;
  const body = await request.json();
  const admin = createAdminClient();

  // Settings upsert
  if (body.settings) {
    const settings = { ...body.settings, persona_id: personaId, updated_at: new Date().toISOString() };
    delete settings.created_at;
    const { error } = await admin
      .from("emotional_persona_settings")
      .upsert(settings, { onConflict: "persona_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Weight upserts (array of { signal_key, weight, enabled })
  if (Array.isArray(body.weights)) {
    for (const w of body.weights) {
      if (!w.signal_key) continue;
      const { error } = await admin
        .from("emotional_signal_weights")
        .upsert({
          persona_id: personaId,
          signal_key: w.signal_key,
          weight: w.weight ?? 0,
          enabled: w.enabled ?? true,
          notes: w.notes ?? "",
          updated_at: new Date().toISOString(),
        }, { onConflict: "persona_id,signal_key" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Category override upserts (array of { category_id, enabled_override, override_patch, ... })
  if (Array.isArray(body.overrides)) {
    for (const o of body.overrides) {
      if (!o.category_id) continue;
      const { error } = await admin
        .from("emotional_category_overrides")
        .upsert({
          persona_id: personaId,
          category_id: o.category_id,
          enabled_override: o.enabled_override ?? null,
          override_patch: o.override_patch || {},
          trigger_overrides: o.trigger_overrides || {},
          style_overrides: o.style_overrides || {},
          custom_examples: o.custom_examples || [],
          updated_at: new Date().toISOString(),
        }, { onConflict: "persona_id,category_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
