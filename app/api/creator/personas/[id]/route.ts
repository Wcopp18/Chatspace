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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ persona: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();

  // Build update payload — only include fields that were sent
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.display_name !== undefined) update.display_name = body.display_name;
  if (body.bio !== undefined) update.bio = body.bio;
  if (body.warmth !== undefined) update.warmth = body.warmth;
  if (body.tease_level !== undefined) update.tease_level = body.tease_level;
  if (body.texting_style !== undefined) update.texting_style = body.texting_style;
  if (body.emoji_style !== undefined) update.emoji_style = body.emoji_style;
  if (body.sentence_length !== undefined) update.sentence_length = body.sentence_length;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.tension_intro !== undefined) update.tension_intro = body.tension_intro;
  if (body.tension_tips_rise !== undefined) update.tension_tips_rise = body.tension_tips_rise;
  if (body.tension_tips_fall !== undefined) update.tension_tips_fall = body.tension_tips_fall;

  const { data, error } = await admin
    .from("personas")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ persona: data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const admin = createAdminClient();
  const ext = file.name.split(".").pop();
  const path = `personas/${id}/avatar.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(path);

  await admin.from("personas").update({ avatar_url: publicUrl }).eq("id", id);

  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  // Delete related data first
  await admin.from("persona_phrase_bank").delete().eq("persona_id", id);
  await admin.from("moments").delete().eq("persona_id", id);
  await admin.from("continuation_prompts").delete().eq("persona_id", id);
  await admin.from("conversations").delete().eq("persona_id", id);
  await admin.from("tension_state").delete().eq("persona_id", id);

  const { error } = await admin.from("personas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
