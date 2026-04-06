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

const BAND_COLORS: Record<TensionBand, string> = {
  warming_up: "from-blue-500/40 to-blue-400/60",
  image_zone: "from-pink-500/60 to-rose-400/80",
  premium_zone: "from-purple-500/70 to-fuchsia-400/90",
  video_zone: "from-red-500/80 to-orange-400/95",
};

const BAND_GLOW: Record<TensionBand, string> = {
  warming_up: "shadow-blue-500/20",
  image_zone: "shadow-pink-500/30",
  premium_zone: "shadow-purple-500/40",
  video_zone: "shadow-red-500/50",
};

const BAND_LABELS: Record<TensionBand, string> = {
  warming_up: "Warming up...",
  image_zone: "Getting interesting...",
  premium_zone: "She's feeling it...",
  video_zone: "Maximum tension",
};

const BAND_ICONS: Record<TensionBand, string> = {
  warming_up: "💭",
  image_zone: "📸",
  premium_zone: "✨",
  video_zone: "🎬",
};

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
    <div className="px-4 py-2">
      <div className={`relative bg-[#1A1A2E] rounded-xl border border-white/5 px-3 py-2 shadow-lg ${BAND_GLOW[tension.band]}`}>
        {/* Label row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{BAND_ICONS[tension.band]}</span>
            <span className="text-white/50 text-[11px] font-medium">
              {BAND_LABELS[tension.band]}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Delta indicator */}
            <AnimatePresence>
              {showDelta && tension.delta !== 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`text-[11px] font-bold ${
                    tension.delta > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {tension.delta > 0 ? "+" : ""}{tension.delta.toFixed(1)}
                </motion.span>
              )}
            </AnimatePresence>

            <span className="text-white/30 text-[11px] font-mono">
              {Math.round(percentage)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
          {/* Zone markers */}
          <div className="absolute inset-0 flex">
            <div className="w-[40%] border-r border-white/10" />
            <div className="w-[30%] border-r border-white/10" />
            <div className="w-[20%] border-r border-white/10" />
            <div className="w-[10%]" />
          </div>

          {/* Fill */}
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${BAND_COLORS[tension.band]}`}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />

          {/* Glow effect at the tip */}
          <motion.div
            className="absolute top-0 bottom-0 w-4 rounded-full blur-sm"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
            }}
            initial={false}
            animate={{ left: `calc(${percentage}% - 8px)` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>

        {/* Zone labels */}
        <div className="flex mt-1 text-[9px] text-white/20">
          <div className="w-[40%]">📸 40</div>
          <div className="w-[30%]">✨ 70</div>
          <div className="w-[20%]">🎬 90</div>
          <div className="w-[10%]" />
        </div>

        {/* Reward triggered flash */}
        <AnimatePresence>
          {tension.rewardTriggered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm"
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
    </div>
  );
}
