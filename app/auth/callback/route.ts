import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Only allow relative redirects to prevent open-redirect attacks
  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}

// Handle Apple Sign-In form_post response mode
export async function POST(request: Request) {
  const formData = await request.formData();
  const code = formData.get("code") as string | null;
  const state = formData.get("state") as string | null;
  const origin = new URL(request.url).origin;

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (state) params.set("state", state);

  return NextResponse.redirect(`${origin}/auth/callback?${params.toString()}`);
}
