"use client";

import { useEffect, useState } from "react";
import PremiumMomentCard from "./PremiumMomentCard";
import type { Database } from "@/types/database";

type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface Props {
  moment: Moment | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  personaName: string;
  onDismiss: () => void;
}

const REVEAL_DURATION_MS = 5000;

/**
 * Full-screen centered popup that appears for ~5 seconds when the girl
 * "sends" a new moment in chat. Auto-dismisses, tap anywhere to close.
 * Mobile-first.
 *
 * Photos = gold card. Videos = purple card.
 */
export default function MomentRevealModal({ moment, onDismiss }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!moment) return;
    setProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / REVEAL_DURATION_MS, 1);
      setProgress(pct);
      if (pct >= 1) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [moment, onDismiss]);

  if (!moment) return null;

  const isVideo = moment.media_type === "video";
  const theme = isVideo ? "purple" : "gold";
  const accentColor = isVideo ? "#9810fa" : "#FFD700";
  const accentGlow = isVideo
    ? "rgba(152, 16, 250, 0.6)"
    : "rgba(255, 184, 0, 0.65)";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(8px)" }}
      onClick={onDismiss}
    >
      <div
        className="flex flex-col items-center gap-3 animate-moment-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium card (image-based; auto-dismiss handled by progress timer) */}
        <PremiumMomentCard theme={theme} />

        {/* 5-second progress bar */}
        <div className="w-[260px] h-1 bg-white/10 rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-[width] duration-[50ms] ease-linear"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${accentColor}, white)`,
              boxShadow: `0 0 8px ${accentGlow}`,
            }}
          />
        </div>
        <p className="text-white/40 text-[11px]">tap anywhere to dismiss</p>
      </div>
    </div>
  );
}
