"use client";

import { useState } from "react";
import PremiumMomentCard from "@/components/chat/PremiumMomentCard";
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
 * In-chat moment offer. Premium "lightning" image card.
 * - Photos -> gold theme
 * - Videos -> purple theme
 *
 * Title / tease copy / price / button label are part of the source PNG.
 */
export default function MomentCard({
  moment,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  persona,
  onDismiss,
  onUnlock,
}: Props) {
  const [unlocking, setUnlocking] = useState(false);
  const [showUnlocked, setShowUnlocked] = useState(moment.unlocked);

  const isVideo = moment.media_type === "video";
  const theme = isVideo ? "purple" : "gold";

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
        thumbnailUrl={moment.thumbnail_url}
        price={moment.price}
        onCtaClick={handleUnlock}
        onDismissClick={onDismiss}
        busy={unlocking}
      />
    </div>
  );
}
