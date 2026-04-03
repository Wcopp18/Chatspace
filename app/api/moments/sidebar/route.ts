import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { momentId } = await request.json();

  // Mark moment as moved to sidebar via user's unlock record with null payment
  // In MVP we track this as a metadata field on the conversation
  // For now we just acknowledge the action
  return NextResponse.json({ success: true, momentId });
}
