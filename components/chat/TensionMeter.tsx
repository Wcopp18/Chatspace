"use client";

import { useEffect, useState, useRef } from "react";
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
  const [shake, setShake] = useState(false);
  const [showBolt, setShowBolt] = useState(false);
  const [isNegative, setIsNegative] = useState(false);
  const prevScore = useRef(0);

  useEffect(() => {
    if (!tension) return;

    const goingUp = tension.delta > 0;
    const goingDown = tension.delta < 0;
    setIsNegative(goingDown);

    setDisplayScore(tension.score);
    prevScore.current = tension.score;

    if (tension.delta !== 0) {
      setShowDelta(true);
      setShake(true);

      if (goingUp) {
        setShowBolt(true);
        setTimeout(() => setShowBolt(false), 800);
      }

      const deltaTimer = setTimeout(() => setShowDelta(false), 2500);
      const shakeTimer = setTimeout(() => setShake(false), 600);
      return () => {
        clearTimeout(deltaTimer);
        clearTimeout(shakeTimer);
      };
    }
  }, [tension]);

  if (!tension) return null;

  const percentage = Math.max(0, Math.min(100, displayScore));

  return (
    <motion.div
      className="px-4 pt-3 pb-4"
      animate={shake ? (isNegative
        ? { x: [0, -6, 6, -4, 4, -2, 0] }
        : { x: [0, -3, 5, -4, 3, -2, 1, 0] }
      ) : {}}
      transition={{ duration: isNegative ? 0.5 : 0.4 }}
    >
      {/* Title + Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{
              background: "linear-gradient(to right, #FFD700, #FFA500)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Tension Meter
          </span>
          {/* Lightning bolt on increase */}
          <AnimatePresence>
            {showBolt && (
              <motion.span
                initial={{ opacity: 0, scale: 0, rotate: -30 }}
                animate={{ opacity: 1, scale: 1.4, rotate: 0 }}
                exit={{ opacity: 0, scale: 0, rotate: 30 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="text-base"
                style={{ filter: "drop-shadow(0 0 6px #FFD700)" }}
              >
                ⚡
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Delta badge */}
          <AnimatePresence>
            {showDelta && tension.delta !== 0 && (
              <motion.span
                initial={isNegative
                  ? { opacity: 0, scale: 2, rotate: -10 }
                  : { opacity: 0, x: 10, scale: 0.5 }
                }
                animate={isNegative
                  ? { opacity: 1, scale: 1, rotate: 0 }
                  : { opacity: 1, x: 0, scale: 1 }
                }
                exit={{ opacity: 0, scale: 0.3 }}
                transition={isNegative
                  ? { type: "spring", stiffness: 300, damping: 10 }
                  : { type: "spring", stiffness: 400, damping: 20 }
                }
                className={`font-black px-2 py-0.5 rounded-md ${
                  isNegative
                    ? "text-red-400 bg-red-500/20 text-sm border border-red-500/30"
                    : "text-green-400 bg-green-400/10 text-[11px]"
                }`}
              >
                {tension.delta > 0 ? "+" : ""}{tension.delta.toFixed(1)}
              </motion.span>
            )}
          </AnimatePresence>
          {/* Score number */}
          <motion.span
            className={`text-base font-bold tabular-nums ${isNegative && shake ? "text-red-400" : "text-white/90"}`}
            animate={shake ? (isNegative
              ? { scale: [1, 0.8, 1.1, 1] }
              : { scale: [1, 1.3, 1] }
            ) : {}}
            transition={{ duration: 0.4 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        </div>
      </div>

      {/* Progress bar */}
      <motion.div
        className="relative h-6 bg-white/8 rounded-full overflow-hidden border border-white/5"
        animate={shake && !isNegative
          ? { boxShadow: ["0 0 0px rgba(139,92,246,0)", "0 0 20px rgba(139,92,246,0.6)", "0 0 0px rgba(139,92,246,0)"] }
          : shake && isNegative
            ? { boxShadow: ["0 0 0px rgba(239,68,68,0)", "0 0 16px rgba(239,68,68,0.5)", "0 0 0px rgba(239,68,68,0)"] }
            : {}
        }
        transition={{ duration: 0.8 }}
      >
        {/* Fill gradient */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: isNegative && shake
              ? "linear-gradient(to right, #EF4444, #DC2626)"
              : percentage >= 70
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
          className="absolute top-0 bottom-0 w-8 rounded-full"
          style={{
            background: isNegative && shake
              ? "radial-gradient(circle, rgba(239,68,68,0.8) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(139,92,246,0.8) 0%, transparent 70%)",
            filter: "blur(4px)",
          }}
          initial={false}
          animate={{ left: `calc(${percentage}% - 12px)` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />

        {/* Lightning crack overlay on increase */}
        <AnimatePresence>
          {showBolt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(to right, transparent 30%, rgba(255,215,0,0.3) 50%, transparent 70%)",
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Zone labels */}
      <div className="flex justify-between mt-3">
        {ZONE_LABELS.map((zone) => {
          const isActive = tension.band === zone.key;
          return (
            <motion.span
              key={zone.key}
              className={`text-[11px] font-semibold transition-colors ${
                isActive ? "text-white" : "text-white/25"
              }`}
              animate={isActive && shake ? { scale: [1, 1.15, 1] } : {}}
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
    </motion.div>
  );
}
