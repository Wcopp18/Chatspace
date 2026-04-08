"use client";

import { motion } from "framer-motion";

interface Props {
  progressCopy: string;
  nextRewardLabel: string;
  currentProgress: number; // 0-1
  stepsRemaining: number;
  onDismiss: () => void;
}

export default function RewardProgressCard({
  progressCopy,
  nextRewardLabel,
  currentProgress,
  stepsRemaining,
  onDismiss,
}: Props) {
  const percentage = Math.max(0, Math.min(100, currentProgress * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 250, damping: 25 }}
      className="my-2 mx-1"
    >
      <div className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] backdrop-blur-sm px-4 py-3">
        {/* Subtle glow */}
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-12 rounded-full blur-2xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {/* Badge icon */}
          <div className="flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
            >
              {percentage >= 100 ? (
                <span className="text-lg">&#10024;</span>
              ) : (
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 15l-2 5l9-11h-5l2-5l-9 11h5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold leading-tight">
              {progressCopy}
            </p>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: "linear-gradient(to right, #8B5CF6, #A855F7, #FF3CAC)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              {/* Glow at tip */}
              <motion.div
                className="absolute top-0 bottom-0 w-3 rounded-full blur-sm bg-purple-400/60"
                initial={{ left: 0 }}
                animate={{ left: `calc(${percentage}% - 6px)` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>

            {/* Next reward label */}
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-white/40 text-[10px]">
                {stepsRemaining > 0 ? `${stepsRemaining} more to go` : "Ready!"}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-purple-400 text-[10px] font-medium">{nextRewardLabel}</span>
                <span className="text-purple-400/60 text-[10px]">&#8250;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
