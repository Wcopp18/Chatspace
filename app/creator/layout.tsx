export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      {/* Creator nav */}
      <header className="sticky top-0 z-40 bg-[#0D0D1A]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 safe-top">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-white/40 hover:text-white transition-colors text-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <span className="gradient-text font-bold text-sm">Creator Panel</span>
          </div>
          <span className="text-xs bg-[#FF3CAC]/20 text-[#FF3CAC] px-3 py-1 rounded-full font-medium">Admin</span>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="border-b border-white/5 px-4 bg-[#0D0D1A]">
        <div className="max-w-2xl mx-auto flex gap-1 overflow-x-auto no-scrollbar">
          <Link
            href="/creator"
            className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white border-b-2 border-transparent hover:border-white/20 transition-all whitespace-nowrap"
          >
            Girls
          </Link>
          <Link
            href="/creator/promotions"
            className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white border-b-2 border-transparent hover:border-white/20 transition-all whitespace-nowrap"
          >
            Promotions
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
