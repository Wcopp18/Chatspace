import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  return profile?.is_admin ? user : null;
}

/**
 * Upload a new reward for a level.
 * Accepts multipart: file, media_type, caption?
 * The file is stored in the private `level-rewards` bucket; we return a signed URL
 * for immediate preview, but the stored `media_url` is the bucket path so the
 * client fetches fresh signed URLs on demand.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: levelId } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const mediaType = (formData.get("media_type") as string) || "image";
  const caption = (formData.get("caption") as string) || null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!["image", "video"].includes(mediaType)) {
    return NextResponse.json({ error: "media_type must be image or video" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Insert row first so we have an id for the storage path.
  const { data: reward, error: insertErr } = await admin
    .from("relationship_level_rewards")
    .insert({
      level_id: levelId,
      media_type: mediaType,
      media_url: "",
      caption,
      is_active: true,
    })
    .select()
    .single();

  if (insertErr || !reward) {
    return NextResponse.json({ error: insertErr?.message || "Insert failed" }, { status: 500 });
  }

  const ext = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
  const path = `${levelId}/${reward.id}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await admin.storage
    .from("level-rewards")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadErr) {
    // roll back the empty row
    await admin.from("relationship_level_rewards").delete().eq("id", reward.id);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  await admin
    .from("relationship_level_rewards")
    .update({ media_url: path })
    .eq("id", reward.id);

  const { data: signed } = await admin.storage
    .from("level-rewards")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  return NextResponse.json({
    reward: { ...reward, media_url: path },
    preview_url: signed?.signedUrl || null,
  });
}
