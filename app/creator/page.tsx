export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

export default async function CreatorDashboard() {
  const supabase = await createClient();
  const { data: personas } = await supabase
    .from("personas")
    .select("*")
    .order("sort_order");

  const { data: allMoments } = await supabase
    .from("moments")
    .select("persona_id");

  const momentCounts: Record<string, number> = {};
  (allMoments || []).forEach((m: { persona_id: string }) => {
    momentCounts[m.persona_id] = (momentCounts[m.persona_id] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Girls</h1>
        <p className="text-white/40 text-sm mt-1">Manage personas, moments, and pricing</p>
      </div>

      <div className="grid gap-4">
        {(personas || []).map((persona) => {
          const avatar = persona.avatar_url || PLACEHOLDER_AVATARS[persona.slug] || PLACEHOLDER_AVATARS["luna"];
          return (
            <Link
              key={persona.id}
              href={`/creator/${persona.slug}`}
              className="group flex items-center gap-4 bg-[#1E1E30] border border-white/8 rounded-2xl p-4 hover:border-white/16 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-[#FF3CAC]/20">
                <Image src={avatar} alt={persona.display_name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">{persona.display_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${persona.is_active ? "bg-green-400/15 text-green-400" : "bg-white/10 text-white/40"}`}>
                    {persona.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="text-white/40 text-sm mt-0.5 truncate">{persona.bio}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-white/30 text-xs">Warmth {persona.warmth}/10</span>
                  <span className="text-white/30 text-xs">Tease {persona.tease_level}/10</span>
                  <span className="text-white/30 text-xs">{momentCounts[persona.id] || 0} moments</span>
                </div>
              </div>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
