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
    <div className="relative bg-[#1E1E30] rounded-2xl overflow-hidden max-w-[300px] shadow-lg shadow-purple-900/20">
      {/* Thumbnail / blurred preview */}
      <div className="relative w-full aspect-[4/3] bg-[#252538] overflow-hidden">
        {moment.thumbnail_url ? (
          <Image
            src={moment.thumbnail_url}
            alt={moment.title}
            fill
            className={`object-cover transition-all duration-300 ${showUnlocked ? "" : "blur-xl scale-110 brightness-75"}`}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-30">
              {moment.media_type === "video" ? "🎬" : "📸"}
            </span>
          </div>
        )}

        {/* Purple tint overlay when locked */}
        {!showUnlocked && (
          <div className="absolute inset-0 bg-purple-900/40" />
        )}

        {!showUnlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Centered lock icon with purple gradient circle */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/40">
              <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
        )}

        {/* Rarity badge — top right */}
        {!showUnlocked && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 bg-purple-600/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              ✨ EPIC
            </span>
          </div>
        )}

        {/* Dismiss button — top left when locked */}
        {!showUnlocked && (
          <button
            onClick={onDismiss}
            className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Save for later"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        {/* Tease copy — italic */}
        <p className="text-white/70 text-sm italic leading-snug mb-3">
          {moment.tease_copy || `${persona.display_name} made this for you`}
        </p>

        {!showUnlocked ? (
          <>
            {/* CTA button — full-width purple gradient */}
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {unlocking ? "Unlocking..." : `Unlock • $${price.toFixed(2)}`}
            </button>

            {/* Sub-text below button */}
            <p className="text-white/30 text-[11px] text-center mt-2 leading-relaxed">
              Whatever&apos;s behind this, she almost kept to herself — could be an image, could be a video
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            Unlocked
          </div>
        )}
      </div>
    </div>
  );
}
