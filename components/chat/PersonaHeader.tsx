"use client";

import Image from "next/image";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

interface Props {
  persona: Persona;
  sidebarBadge: number;
  onSidebarOpen: () => void;
  onBack: () => void;
}

export default function PersonaHeader({ persona, sidebarBadge, onSidebarOpen, onBack }: Props) {
  const avatarUrl =
    persona.avatar_url ||
    PLACEHOLDER_AVATARS[persona.slug] ||
    PLACEHOLDER_AVATARS["luna"];

  return (
    <header className="flex-shrink-0 bg-[#0D0D1A]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 safe-top z-30">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all active:scale-95"
          aria-label="Back"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#FF3CAC]/40">
              <Image
                src={avatarUrl}
                alt={persona.display_name}
                width={36}
                height={36}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-[#0D0D1A] rounded-full" />
          </div>

          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {persona.display_name}
            </p>
            <p className="text-green-400 text-xs">Active now</p>
          </div>
        </div>

        {/* Moments sidebar toggle */}
        <button
          onClick={onSidebarOpen}
          className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all active:scale-95"
          aria-label="View moments"
        >
          {/* Grid / moments icon */}
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {sidebarBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF3CAC] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {sidebarBadge}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
