"use client";

import { useEffect } from "react";
import Image from "next/image";
import { PRICING } from "@/lib/constants";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

interface ContinuationData {
  id: string;
  line: string;
  cta: string;
  price: number;
}

interface Props {
  persona: Persona;
  continuation: ContinuationData;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ContinuationPopup({ persona, continuation, onAccept, onDecline }: Props) {
  const avatarUrl =
    persona.avatar_url ||
    PLACEHOLDER_AVATARS[persona.slug] ||
    PLACEHOLDER_AVATARS["luna"];

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const price = continuation.price || PRICING.EMOTIONAL_CONTINUATION;

  return (
    <div className="max-w-[320px] mx-auto my-4">
      {/* Inline card with purple gradient border/glow */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-purple-500/60 via-purple-600/40 to-purple-800/60 shadow-lg shadow-purple-600/20">
        {/* Inner card */}
        <div className="bg-[#1E1E30] rounded-2xl px-5 pt-7 pb-5 text-center relative overflow-hidden">
          {/* Subtle purple glow behind lock */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-28 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Lock icon — purple gradient circle */}
          <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/40 mb-4">
            <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          {/* Bold title */}
          <h3 className="text-white text-lg font-bold leading-snug mb-1.5 text-balance">
            {continuation.line}
          </h3>

          {/* Subtitle */}
          <p className="text-white/40 text-sm mb-5">
            Keep this moment going a little longer
          </p>

          {/* CTA button — full-width purple gradient */}
          <button
            onClick={onAccept}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-purple-600/30 mb-3"
          >
            ✨ Hear it now — ${price.toFixed(2)}
          </button>

          {/* Urgency text */}
          <p className="text-white/30 text-xs italic mb-1">
            This moment won&apos;t last forever...
          </p>

          {/* Decline */}
          <button
            onClick={onDecline}
            className="text-white/25 text-xs py-1.5 hover:text-white/40 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
