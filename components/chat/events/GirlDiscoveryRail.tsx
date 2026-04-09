"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface GirlInfo {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string;
  isOnline: boolean;
  rarity: "common" | "rare" | "exclusive";
}

interface Props {
  title: string;
  girls: GirlInfo[];
  onGirlSelect: (slug: string) => void;
  onDismiss: () => void;
}

const RARITY_RING: Record<string, string> = {
  common: "from-purple-500 to-blue-500",
  rare: "from-pink-500 to-purple-600",
  exclusive: "from-amber-400 via-pink-500 to-purple-600",
};

const RARITY_GLOW: Record<string, string> = {
  common: "shadow-purple-500/20",
  rare: "shadow-pink-500/30",
  exclusive: "shadow-amber-500/30",
};

export default function GirlDiscoveryRail({
  title,
  girls,
  onGirlSelect,
  onDismiss,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="my-3 -mx-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-purple-500" />
          <h3 className="text-white font-bold text-[14px]">{title}</h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/30 hover:text-white/60 transition-colors text-xs"
        >
          Hide
        </button>
      </div>

      {/* Story-style horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
        {girls.map((girl, idx) => (
          <motion.button
            key={girl.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onGirlSelect(girl.slug)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
          >
            {/* Story ring */}
            <div className={`relative p-[2.5px] rounded-full bg-gradient-to-br ${RARITY_RING[girl.rarity]} shadow-lg ${RARITY_GLOW[girl.rarity]}`}>
              {/* Inner border */}
              <div className="p-[2px] rounded-full bg-[#0D0D1A]">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <Image
                    src={girl.avatarUrl}
                    alt={girl.displayName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </div>

              {/* Online pulse indicator */}
              {girl.isOnline && (
                <div className="absolute bottom-0 right-0 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#0D0D1A] flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 relative">
                      <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                    </div>
                  </div>
                </div>
              )}

              {/* Exclusive sparkle */}
              {girl.rarity === "exclusive" && (
                <div className="absolute -top-1 -right-1 z-10">
                  <span className="text-amber-400 text-xs">&#10024;</span>
                </div>
              )}
            </div>

            {/* Name */}
            <span className="text-white/70 text-[11px] font-medium truncate max-w-[70px] group-hover:text-white transition-colors">
              {girl.displayName}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
