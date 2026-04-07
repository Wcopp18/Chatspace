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
  tensionScore?: number;
}

export default function PersonaHeader({ persona, sidebarBadge, onSidebarOpen, onBack, tensionScore = 42 }: Props) {
  const avatarUrl =
    persona.avatar_url ||
    PLACEHOLDER_AVATARS[persona.slug] ||
    PLACEHOLDER_AVATARS["luna"];

  const tensionPercentage = Math.round(Math.max(0, Math.min(100, tensionScore)));

  return (
    <header className="flex-shrink-0 bg-[#0D0D1A] border-b border-white/5 px-4 py-3 safe-top z-30">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        {/* Avatar with online dot */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <Image
              src={avatarUrl}
              alt={persona.display_name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div className="absolute bottom-0 left-0 w-3 h-3 bg-[#22C55E] border-2 border-[#0D0D1A] rounded-full" />
        </div>

        {/* Persona name + mood */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">
            {persona.display_name} ✨
          </p>
          <p className="text-white/50 text-xs">Feeling playful</p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Lock icon */}
          <button
            onClick={onBack}
            className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
            aria-label="Back"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </button>

          {/* Tension circle badge */}
          <div className="relative flex-shrink-0 w-9 h-9">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="url(#tensionGrad)"
                strokeWidth="3"
                strokeDasharray={`${tensionPercentage * 0.9425} 94.25`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="tensionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {tensionPercentage}%
            </span>
          </div>

          {/* Hamburger menu */}
          <button
            onClick={onSidebarOpen}
            className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95"
            aria-label="Menu"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
              <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
              <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
            </svg>
            {sidebarBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#8B5CF6] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {sidebarBadge}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
