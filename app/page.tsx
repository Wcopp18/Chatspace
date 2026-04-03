import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PersonaGrid from "@/components/personas/PersonaGrid";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: personas } = await supabase
    .from("personas")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0D0D1A]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-text">ChatSpace</h1>
          <div className="flex items-center gap-2">
            <a
              href="/account"
              className="w-8 h-8 rounded-full bg-[#1E1E30] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors text-sm"
            >
              👤
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Hero text */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            Who do you want to{" "}
            <span className="gradient-text">connect with?</span>
          </h2>
          <p className="text-white/40 text-sm">Choose your companion. Each one is unique.</p>
        </div>

        {/* Persona grid */}
        <PersonaGrid personas={personas || []} />
      </main>
    </div>
  );
}
