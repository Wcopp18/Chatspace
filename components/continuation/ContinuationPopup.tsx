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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onDecline}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-[#1A1A2E] border border-white/10 rounded-3xl overflow-hidden animate-slide-up shadow-2xl">
        {/* Top gradient bar */}
        <div className="h-1 w-full gradient-bg" />

        {/* Glow behind avatar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#FF3CAC]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="px-6 pt-8 pb-6 text-center">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#FF3CAC]/50 ring-offset-2 ring-offset-[#1A1A2E] mx-auto">
              <Image
                src={avatarUrl}
                alt={persona.display_name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Name */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
            {persona.display_name}
          </p>

          {/* The emotional line */}
          <p className="text-white text-lg font-medium leading-snug mb-6 text-balance">
            &ldquo;{continuation.line}&rdquo;
          </p>

          {/* CTA button */}
          <button
            onClick={onAccept}
            className="w-full gradient-bg text-white font-bold py-4 rounded-2xl text-base glow-pink transition-all active:scale-[0.98] mb-3"
          >
            {continuation.cta || `Stay with ${persona.display_name} • $${price.toFixed(2)}`}
          </button>

          {/* Decline */}
          <button
            onClick={onDecline}
            className="w-full text-white/30 text-sm py-2 hover:text-white/50 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
