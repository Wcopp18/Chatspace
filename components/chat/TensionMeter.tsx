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

const ZONE_LABELS: { key: TensionBand; label: string; emoji: string }[] = [
  { key: "warming_up", label: "Warming Up", emoji: "🔥" },
  { key: "image_zone", label: "Image Zone", emoji: "📸" },
  { key: "premium_zone", label: "Rare Image", emoji: "💎" },
  { key: "video_zone", label: "Video Zone", emoji: "🎬" },
];

export default function TensionMeter({ tension, personaName }: Props) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showDelta, setShowDelta] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!tension) return;

    setDisplayScore(tension.score);

    if (tension.delta !== 0) {
      setShowDelta(true);
      setPulse(true);
      const deltaTimer = setTimeout(() => setShowDelta(false), 2500);
      const pulseTimer = setTimeout(() => setPulse(false), 1000);
      return () => {
        clearTimeout(deltaTimer);
        clearTimeout(pulseTimer);
      };
    }
  }, [tension]);

  if (!tension) return null;

  const percentage = Math.max(0, Math.min(100, displayScore));

  return (
    <div className="px-4 pt-2 pb-3">
      {/* Title + Score */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{
            background: "linear-gradient(to right, #FFD700, #FFA500)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Tension Meter
        </span>
        <div className="flex items-center gap-1.5">
          {/* Delta badge */}
          <AnimatePresence>
            {showDelta && tension.delta !== 0 && (
              <motion.span
                initial={{ opacity: 0, x: 10, scale: 0.5 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.5 }}
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                  tension.delta > 0
                    ? "text-green-400 bg-green-400/10"
                    : "text-red-400 bg-red-400/10"
                }`}
              >
                {tension.delta > 0 ? "+" : ""}{tension.delta.toFixed(1)}
              </motion.span>
            )}
          </AnimatePresence>
          {/* Score number */}
          <motion.span
            className="text-sm font-bold text-white/90 tabular-nums"
            animate={pulse ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        </div>
      </div>

      {/* Progress bar — taller + more visible */}
      <motion.div
        className="relative h-4 bg-white/8 rounded-full overflow-hidden border border-white/5"
        animate={pulse ? { boxShadow: ["0 0 0px rgba(139,92,246,0)", "0 0 16px rgba(139,92,246,0.5)", "0 0 0px rgba(139,92,246,0)"] } : {}}
        transition={{ duration: 0.8 }}
      >
        {/* Fill gradient */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: percentage >= 70
              ? "linear-gradient(to right, #06B6D4, #8B5CF6, #FF3CAC)"
              : "linear-gradient(to right, #06B6D4, #8B5CF6)",
          }}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />

        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-y-0 w-16 rounded-full"
          style={{
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)",
          }}
          animate={{ left: ["-10%", "110%"] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        />

        {/* Glowing tip */}
        <motion.div
          className="absolute top-0 bottom-0 w-6 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.8) 0%, transparent 70%)",
            filter: "blur(4px)",
          }}
          initial={false}
          animate={{ left: `calc(${percentage}% - 12px)` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </motion.div>

      {/* Zone labels */}
      <div className="flex justify-between mt-2.5">
        {ZONE_LABELS.map((zone) => {
          const isActive = tension.band === zone.key;
          return (
            <motion.span
              key={zone.key}
              className={`text-[10px] font-semibold transition-colors ${
                isActive ? "text-white" : "text-white/25"
              }`}
              animate={isActive ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {isActive && <span className="mr-0.5">{zone.emoji}</span>}
              {zone.label}
            </motion.span>
          );
        })}
      </div>

      {/* Reward triggered flash */}
      <AnimatePresence>
        {tension.rewardTriggered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="mt-3 flex items-center justify-center py-3 rounded-xl border border-purple-500/30"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(255,60,172,0.15))",
              boxShadow: "0 0 20px rgba(139,92,246,0.2)",
            }}
          >
            <div className="text-center">
              <motion.span
                className="text-2xl"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.8, repeat: 2 }}
              >
                🔓
              </motion.span>
              <p className="text-white text-sm font-bold mt-1">
                {personaName} has something for you...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
