"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

export interface DeliveredReward {
  id: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  level_id: string;
  level_name: string;
  level_number: number;
}

interface Props {
  rewards: DeliveredReward[];
  personaName: string;
  onDismiss: () => void;
}

/**
 * Modal shown when the user levels up and their creator has uploaded free
 * media for that level. These are GIFT rewards (not monetized unlocks), so
 * no price, no paywall.
 */
export default function LevelRewardModal({ rewards, personaName, onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  if (rewards.length === 0) return null;
  const current = rewards[index];
  const levelName = current.level_name;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1A1A2E] rounded-2xl border border-white/10 p-5 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-4">
            <p className="text-xs uppercase tracking-widest text-yellow-400 font-bold">
              You reached {levelName}
            </p>
            <h2 className="text-white text-xl font-bold mt-1">
              A gift from {personaName}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              For sticking with her this far.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 mb-4">
            {current.media_type === "video" ? (
              <video
                key={current.id}
                src={current.media_url}
                controls
                autoPlay
                playsInline
                className="w-full aspect-[4/5] bg-black object-cover"
              />
            ) : (
              <Image
                src={current.media_url}
                alt={current.caption || "Level reward"}
                width={600}
                height={750}
                className="w-full aspect-[4/5] object-cover"
                unoptimized
              />
            )}
          </div>

          {current.caption && (
            <p className="text-white/70 text-sm italic text-center mb-3">
              &ldquo;{current.caption}&rdquo;
            </p>
          )}

          {rewards.length > 1 && (
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="text-white/60 text-sm disabled:text-white/20"
              >
                ← Prev
              </button>
              <span className="text-white/50 text-xs">
                {index + 1} / {rewards.length}
              </span>
              <button
                onClick={() => setIndex((i) => Math.min(rewards.length - 1, i + 1))}
                disabled={index === rewards.length - 1}
                className="text-white/60 text-sm disabled:text-white/20"
              >
                Next →
              </button>
            </div>
          )}

          <button
            onClick={onDismiss}
            className="w-full gradient-bg text-white text-sm font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            {rewards.length > 1 && index < rewards.length - 1 ? "Keep Going" : "Close"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
