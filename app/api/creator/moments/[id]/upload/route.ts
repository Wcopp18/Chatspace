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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const path = `moments/${id}/thumbnail.${ext}`;
    const { error } = await admin.storage
      .from("thumbnails")
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("thumbnails").getPublicUrl(path);
    url = publicUrl;

    await admin.from("moments").update({ thumbnail_url: url, updated_at: new Date().toISOString() }).eq("id", id);
  } else {
    const path = `moments/${id}/media.${ext}`;
    const { error } = await admin.storage
      .from("moments")
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data, error: signedUrlError } = await admin.storage
      .from("moments")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year signed URL
    if (signedUrlError || !data?.signedUrl) {
      return NextResponse.json(
        { error: signedUrlError?.message || "Failed to create signed URL" },
        { status: 500 }
      );
    }
    const signedUrl = data.signedUrl;

    url = signedUrl;
    await admin.from("moments").update({ media_url: path, updated_at: new Date().toISOString() }).eq("id", id);
  }

  return NextResponse.json({ url });
}
