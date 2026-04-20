"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface RelationshipSnapshot {
  currentLevelNumber: number;
  currentLevelName: string;
  currentLevelIcon: string | null;
  currentLevelColor: string | null;
  currentLevelDescription: string | null;
  xpIntoCurrentLevel: number;
  xpToComplete: number;
  progressPct: number;
  nextLevelName: string | null;
  nextLevelNumber: number | null;
  highestLevelReached: number;
  totalXpEarned: number;
  isMaxLevel: boolean;
}

interface LevelUpSummary { fromLevel: number; toLevel: number; levelName: string }

interface Props {
  snapshot: RelationshipSnapshot | null;
  xpAwarded: number;
  levelUps: LevelUpSummary[];
  personaName: string;
}

/**
 * Long-term relationship meter shown above the chat. Replaces the session
 * tension meter visually. Session tension still runs behind the scenes and
 * drives premium-moment unlocks.
 */
export default function RelationshipMeter({ snapshot, xpAwarded, levelUps, personaName }: Props) {
  const [showXp, setShowXp] = useState(false);
  const [levelUpFlash, setLevelUpFlash] = useState<LevelUpSummary | null>(null);
  const prevPct = useRef(0);

  useEffect(() => {
    if (!snapshot) return;
    if (xpAwarded > 0) {
      setShowXp(true);
      const t = setTimeout(() => setShowXp(false), 2200);
      return () => clearTimeout(t);
    }
  }, [xpAwarded, snapshot]);

  useEffect(() => {
    if (levelUps.length === 0) return;
    setLevelUpFlash(levelUps[levelUps.length - 1]);
    const t = setTimeout(() => setLevelUpFlash(null), 3200);
    return () => clearTimeout(t);
  }, [levelUps]);

  useEffect(() => {
    if (snapshot) prevPct.current = snapshot.progressPct;
  }, [snapshot]);

  if (!snapshot) return null;

  const color = snapshot.currentLevelColor || "#8B5CF6";

  return (
    <div className="px-4 pt-3 pb-4 relative">
      {/* Level-up flash */}
      <AnimatePresence>
        {levelUpFlash && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-x-0 -top-1 z-10 flex justify-center pointer-events-none"
          >
            <span
              className="text-sm font-bold italic tracking-wide px-4 py-1.5"
              style={{ color: "#FFD700", textShadow: "0 0 14px rgba(255,215,0,0.6)" }}
            >
              {personaName} sees you differently now — {levelUpFlash.levelName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {snapshot.currentLevelIcon && (
            <span className="text-base" aria-hidden>{snapshot.currentLevelIcon}</span>
          )}
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{
              background: `linear-gradient(to right, ${color}, #FFFFFFAA)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {snapshot.currentLevelName}
          </span>
          <span className="text-[10px] text-white/30 font-semibold">
            LVL {snapshot.currentLevelNumber}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AnimatePresence>
            {showXp && xpAwarded > 0 && (
              <motion.span
                initial={{ opacity: 0, x: 10, scale: 0.5 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="font-black px-2 py-0.5 rounded-md text-[11px] text-green-400 bg-green-400/10"
              >
                +{xpAwarded} XP
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-xs font-semibold tabular-nums text-white/70">
            {snapshot.isMaxLevel
              ? "MAX"
              : `${snapshot.xpIntoCurrentLevel}/${snapshot.xpToComplete}`}
          </span>
        </div>
      </div>

      <div className="relative h-5 bg-white/8 rounded-full overflow-hidden border border-white/5">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: snapshot.isMaxLevel
              ? `linear-gradient(to right, ${color}, #FFD700)`
              : `linear-gradient(to right, ${color}, #FFFFFFCC)`,
          }}
          initial={false}
          animate={{ width: `${snapshot.progressPct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
        <motion.div
          className="absolute inset-y-0 w-16 rounded-full opacity-60"
          style={{
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
          }}
          animate={{ left: ["-10%", "110%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-[10px] text-white/40">
        <span>{snapshot.currentLevelDescription || "Your bond is growing."}</span>
        {snapshot.nextLevelName && (
          <span className="text-white/50 font-semibold">Next: {snapshot.nextLevelName}</span>
        )}
      </div>
    </div>
  );
}
