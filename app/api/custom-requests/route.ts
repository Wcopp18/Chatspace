import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/custom-requests — Submit a custom video request
 * GET  /api/custom-requests — List user's custom requests
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { personaId, conversationId, sceneIdea, outfit, locationVibe, mood, styleReferences, customNotes } = body;

  if (!personaId || !sceneIdea) {
    return NextResponse.json({ error: "Missing personaId or sceneIdea" }, { status: 400 });
  }

  const { data: request_data, error } = await supabase
    .from("custom_requests")
    .insert({
      user_id: user.id,
      persona_id: personaId,
      conversation_id: conversationId || null,
      scene_idea: sceneIdea,
      outfit: outfit || null,
      location_vibe: locationVibe || null,
      mood: mood || null,
      style_references: styleReferences || null,
      custom_notes: customNotes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Custom request error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: request_data });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: requests } = await supabase
    .from("custom_requests")
    .select("*, personas(display_name, slug, avatar_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ requests: requests || [] });
}
