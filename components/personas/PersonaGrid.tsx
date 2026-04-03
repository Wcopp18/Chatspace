"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

const PLACEHOLDER_AVATARS: Record<string, string> = {
  "luna": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  "nova": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  "aria": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

const VIBE_COLORS: Record<string, string> = {
  playful: "from-pink-500 to-purple-500",
  flirty: "from-red-400 to-pink-500",
  mysterious: "from-purple-600 to-blue-500",
  wholesome: "from-orange-400 to-pink-400",
  edgy: "from-gray-600 to-purple-600",
};

const VIBE_BADGES: Record<string, string> = {
  playful: "✨ Playful",
  flirty: "🔥 Flirty",
  mysterious: "🌙 Mysterious",
  wholesome: "💕 Sweet",
  edgy: "⚡ Bold",
};

export default function PersonaGrid({ personas }: { personas: Persona[] }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-4">
      {personas.map((persona) => {
        const avatarUrl = persona.avatar_url || PLACEHOLDER_AVATARS[persona.slug] || PLACEHOLDER_AVATARS["luna"];
        const gradientClass = VIBE_COLORS[persona.texting_style] || "from-pink-500 to-purple-500";
        const badge = VIBE_BADGES[persona.texting_style] || "✨ Unique";

        return (
          <button
            key={persona.id}
            onClick={() => router.push(`/chat/${persona.slug}`)}
            className="group relative bg-[#1E1E30] border border-white/6 rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-all duration-200 hover:border-white/12"
          >
            {/* Gradient glow on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientClass} p-0.5`}>
                  <div className="w-full h-full rounded-[14px] overflow-hidden">
                    <Image
                      src={avatarUrl}
                      alt={persona.display_name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                </div>
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-[#1E1E30] rounded-full" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-white font-semibold text-base">{persona.display_name}</h3>
                  <span className="text-xs bg-white/8 text-white/60 px-2 py-0.5 rounded-full">{badge}</span>
                </div>
                <p className="text-white/50 text-sm line-clamp-2 leading-snug">
                  {persona.bio || "Ready to chat..."}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 text-white/20 group-hover:text-white/50 transition-colors">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>

            {/* Bottom strip */}
            <div className={`h-0.5 w-full bg-gradient-to-r ${gradientClass} opacity-30`} />
          </button>
        );
      })}

      {personas.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <div className="text-4xl mb-3">💫</div>
          <p className="text-sm">No companions yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
