import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PRICING } from "@/lib/constants";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      <header className="sticky top-0 z-40 bg-[#0D0D1A]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <a href="/" className="text-white/60 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
          <h1 className="text-lg font-semibold text-white">Account</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Profile card */}
        <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white text-xl font-bold">
              {user.email?.[0].toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-white font-semibold">{profile?.display_name || "User"}</p>
              <p className="text-white/50 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">Subscription</h3>
          {profile?.is_subscribed ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-medium text-sm">✓ Active</p>
                <p className="text-white/40 text-xs mt-0.5">Premium membership</p>
              </div>
              <span className="text-white/60 text-sm">${PRICING.SUBSCRIPTION_MONTHLY}/mo</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-white/50 text-sm">Unlock exclusive content, moments and more.</p>
              <button className="w-full gradient-bg text-white font-semibold py-3 rounded-xl text-sm glow-pink-sm">
                Subscribe — ${PRICING.SUBSCRIPTION_MONTHLY}/mo
              </button>
            </div>
          )}
        </div>

        {/* Sign out */}
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full bg-white/5 border border-white/8 text-white/60 font-medium py-3 rounded-xl text-sm hover:bg-white/8 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </main>
    </div>
  );
}
