export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      <header className="sticky top-0 z-40 bg-[#0D0D1A]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-white/40 hover:text-white transition-colors text-sm">← App</a>
            <span className="text-white/20">/</span>
            <span className="gradient-text font-bold text-sm">Creator Panel</span>
          </div>
          <span className="text-xs bg-[#FF3CAC]/20 text-[#FF3CAC] px-3 py-1 rounded-full font-medium">Admin</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
