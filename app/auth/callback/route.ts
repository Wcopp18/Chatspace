import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  // Read redirect path from query param, falling back to cookie
  // (Supabase OAuth can strip query params from redirectTo during the dance)
  let next = requestUrl.searchParams.get("next");
  if (!next) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get("auth_redirect")?.value;
    if (cookieValue) {
      next = decodeURIComponent(cookieValue);
    }
  }
  next = next ?? "/";

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

  // Clear the redirect cookie
  const response = NextResponse.redirect(`${origin}${safeNext}`);
  response.cookies.set("auth_redirect", "", { path: "/", maxAge: 0 });
  return response;
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
