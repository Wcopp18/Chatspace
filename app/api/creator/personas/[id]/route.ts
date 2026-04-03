import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("personas")
    .update({
      display_name: body.display_name,
      bio: body.bio,
      warmth: body.warmth,
      tease_level: body.tease_level,
      texting_style: body.texting_style,
      emoji_style: body.emoji_style,
      sentence_length: body.sentence_length,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ persona: data });
}
