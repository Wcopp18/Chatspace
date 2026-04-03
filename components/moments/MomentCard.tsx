"use client";

import { useState } from "react";
import Image from "next/image";
import { PRICING } from "@/lib/constants";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface Props {
  moment: Moment;
  persona: Persona;
  onDismiss: () => void;
  onUnlock: () => void;
}

export default function MomentCard({ moment, persona, onDismiss, onUnlock }: Props) {
  const [unlocking, setUnlocking] = useState(false);
  const [showUnlocked, setShowUnlocked] = useState(moment.unlocked);

  const price = moment.media_type === "video" ? PRICING.VIDEO_UNLOCK : PRICING.IMAGE_UNLOCK;

  async function handleUnlock() {
    setUnlocking(true);
    await onUnlock();
    setShowUnlocked(true);
    setUnlocking(false);
  }

  return (
    <div className="relative bg-[#1E1E30] border border-white/8 rounded-2xl overflow-hidden max-w-[280px]">
      {/* Thumbnail / blurred preview */}
      <div className="relative w-full aspect-[4/3] bg-[#252538] overflow-hidden">
        {moment.thumbnail_url ? (
          <Image
            src={moment.thumbnail_url}
            alt={moment.title}
            fill
            className={`object-cover transition-all duration-300 ${showUnlocked ? "" : "blur-xl scale-110"}`}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-30">
              {moment.media_type === "video" ? "🎬" : "📸"}
            </span>
          </div>
        )}

        {!showUnlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-2">
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-white/80 text-xs font-medium">
              {moment.media_type === "video" ? "Video" : "Photo"} locked
            </p>
          </div>
        )}

        {/* Dismiss button */}
        {!showUnlocked && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Save for later"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-white/80 text-sm leading-snug mb-2">{moment.tease_copy}</p>

        {!showUnlocked ? (
          <button
            onClick={handleUnlock}
            disabled={unlocking}
            className="w-full gradient-bg text-white text-sm font-semibold py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {unlocking ? "Unlocking…" : `Unlock • $${price.toFixed(2)}`}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Unlocked
          </div>
        )}
      </div>
    </div>
  );
}
