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
 * POST /api/creator/levels/[id]/rewards/[rewardId]/upload
 * Upload media file for a level reward
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rewardId: string }> }
) {
  const { id: levelId, rewardId } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const uploadType = (formData.get("type") as string) || "media"; // "media" | "thumbnail"

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const admin = createAdminClient();
  const ext = file.name.split(".").pop();
  const bytes = await file.arrayBuffer();

  let url: string;

  if (uploadType === "thumbnail") {
    const path = `level-rewards/${levelId}/${rewardId}/thumbnail.${ext}`;
    const { error } = await admin.storage
      .from("thumbnails")
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("thumbnails").getPublicUrl(path);
    url = publicUrl;

    await admin.from("relationship_level_rewards")
      .update({ thumbnail_url: url })
      .eq("id", rewardId);
  } else {
    const path = `level-rewards/${levelId}/${rewardId}/media.${ext}`;
    const { error } = await admin.storage
      .from("level-rewards")
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Short-lived preview URL only — stored value is the path; signed URLs
    // are minted on-demand by /api/media/reward/[id] at display time.
    const { data, error: signedUrlError } = await admin.storage
      .from("level-rewards")
      .createSignedUrl(path, 300);
    if (signedUrlError || !data?.signedUrl) {
      return NextResponse.json(
        { error: signedUrlError?.message || "Failed to create preview URL" },
        { status: 500 }
      );
    }
    url = data.signedUrl;

    await admin.from("relationship_level_rewards")
      .update({ media_url: path })
      .eq("id", rewardId);
  }

  return NextResponse.json({ url });
}
