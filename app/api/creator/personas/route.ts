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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "girl-" + Date.now();
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { display_name } = body;

  if (!display_name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = generateSlug(display_name);

  // Check slug uniqueness
  const { data: existing } = await admin
    .from("personas")
    .select("id")
    .eq("slug", slug)
    .single();

  const finalSlug = existing ? slug + "-" + Date.now().toString(36).slice(-4) : slug;

  // Get max sort_order
  const { data: maxSort } = await admin
    .from("personas")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextSort = (maxSort?.sort_order || 0) + 1;

  const { data, error } = await admin
    .from("personas")
    .insert({
      display_name: display_name.trim(),
      slug: finalSlug,
      bio: "",
      warmth: 7,
      tease_level: 5,
      texting_style: "Playful",
      emoji_style: "moderate",
      sentence_length: "medium",
      is_active: false,  // Start hidden until configured
      sort_order: nextSort,
      continuation_frequency: 30,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ persona: data });
}
