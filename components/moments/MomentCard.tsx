"use client";

import { useState } from "react";
import PremiumMomentCard from "@/components/chat/PremiumMomentCard";
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

/**
 * In-chat moment offer. Premium lightning look (compact size).
 * - Photos: gold theme
 * - Videos: purple/blue theme
 *
 * Appears as if the girl sent it. Taps "Reveal Photo" / "Watch Now"
 * to unlock; dismiss button (top-left) saves it to the shelf for later.
 */
export default function MomentCard({
  moment,
  persona,
  onDismiss,
  onUnlock,
}: Props) {
  const [unlocking, setUnlocking] = useState(false);
  const [showUnlocked, setShowUnlocked] = useState(moment.unlocked);

  const isVideo = moment.media_type === "video";
  const price = isVideo ? PRICING.VIDEO_UNLOCK : PRICING.IMAGE_UNLOCK;
  const theme = isVideo ? "purple" : "gold";
  const ctaLabel = isVideo ? "Watch Now" : "Reveal Photo";

  async function handleUnlock() {
    setUnlocking(true);
    await onUnlock();
    setShowUnlocked(true);
    setUnlocking(false);
  }

  if (showUnlocked) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] bg-white/[0.06] border border-white/10 rounded-3xl px-4 py-3 flex items-center gap-2 text-green-400 text-sm font-semibold backdrop-blur-md">
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                d="M20 6L9 17l-5-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {moment.title} • Unlocked
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3 px-4">
      <PremiumMomentCard
        compact
        theme={theme}
        title={moment.title}
        teaseCopy={
          moment.tease_copy ||
          `${persona.display_name} made this for you`
        }
        price={price}
        thumbnailUrl={moment.thumbnail_url}
        ctaLabel={ctaLabel}
        onCtaClick={handleUnlock}
        onDismissClick={onDismiss}
        busy={unlocking}
      />
    </div>
  );
}
