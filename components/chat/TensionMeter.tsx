"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type TensionBand = "warming_up" | "image_zone" | "premium_zone" | "video_zone";

interface TensionData {
  score: number;
  band: TensionBand;
  delta: number;
  previousBand: TensionBand;
  rewardTriggered: boolean;
}

interface Props {
  tension: TensionData | null;
  personaName: string;
}

const ZONE_LABELS: { key: TensionBand; label: string }[] = [
  { key: "warming_up", label: "Warming Up" },
  { key: "image_zone", label: "Image Zone" },
  { key: "premium_zone", label: "Rare Image" },
  { key: "video_zone", label: "Video Zone" },
];

export default function TensionMeter({ tension, personaName }: Props) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showDelta, setShowDelta] = useState(false);

  useEffect(() => {
    if (!tension) return;

    // Animate score change
    setDisplayScore(tension.score);

    // Show delta indicator
    if (tension.delta !== 0) {
      setShowDelta(true);
      const timer = setTimeout(() => setShowDelta(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [tension]);

  if (!tension) return null;

  const percentage = Math.max(0, Math.min(100, displayScore));

  return (
    <div className="px-4 pt-2 pb-3">
      {/* Progress bar */}
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(to right, #06B6D4, #8B5CF6)",
          }}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />

        {/* Glow effect at the tip */}
        <motion.div
          className="absolute top-0 bottom-0 w-4 rounded-full blur-sm"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)",
          }}
          initial={false}
          animate={{ left: `calc(${percentage}% - 8px)` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Delta indicator (floating) */}
      <AnimatePresence>
        {showDelta && tension.delta !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex justify-end mt-1"
          >
            <span
              className={`text-[11px] font-bold ${
                tension.delta > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {tension.delta > 0 ? "+" : ""}{tension.delta.toFixed(1)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone labels */}
      <div className="flex justify-between mt-2">
        {ZONE_LABELS.map((zone) => (
          <span
            key={zone.key}
            className={`text-[10px] font-medium transition-colors ${
              tension.band === zone.key
                ? "text-white"
                : "text-white/25"
            }`}
          >
            {zone.label}
          </span>
        ))}
      </div>

      {/* Reward triggered flash */}
      <AnimatePresence>
        {tension.rewardTriggered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mt-2 flex items-center justify-center py-2 bg-[#8B5CF6]/20 rounded-lg backdrop-blur-sm"
          >
            <div className="text-center">
              <span className="text-lg">🔓</span>
              <p className="text-white text-xs font-semibold mt-0.5">
                {personaName} has something for you...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
