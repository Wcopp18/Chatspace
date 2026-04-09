"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle?: string;
  originalPrice: number;
  promoPrice: number;
  durationMinutes: number;
  ctaText: string;
  previewImageUrl?: string | null;
  onClaim: () => void;
  onDismiss: () => void;
  onExpire?: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TimerUrgencyCard({
  title,
  subtitle,
  originalPrice,
  promoPrice,
  durationMinutes,
  ctaText,
  previewImageUrl,
  onClaim,
  onDismiss,
  onExpire,
}: Props) {
  // Use timestamp-based timer so remounts don't reset the countdown
  const startedAtRef = useRef(Date.now());
  const totalSeconds = durationMinutes * 60;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]); // stable dep — no stale closure on onExpire

  const percentLeft = (secondsLeft / totalSeconds) * 100;
  const isUrgent = secondsLeft < 300;
  const savings = Math.round(((originalPrice - promoPrice) / originalPrice) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="my-3 mx-1"
    >
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-950/40 to-[#1E1E30]">
        {/* Red urgency glow */}
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-60 h-20 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000"
          style={{
            background: "radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)",
            opacity: isUrgent ? 1 : 0.6,
          }}
        />

        {/* Dismiss — large touch area around small visual target */}
        <button
          onClick={onDismiss}
          className="absolute top-1 right-1 z-10 p-2"
          aria-label="Dismiss"
        >
          <span className="w-7 h-7 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </span>
        </button>

        <div className="p-4">
          {/* Timer display */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isUrgent ? "bg-red-400 animate-pulse" : "bg-red-500"}`}
              />
              <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">
                Limited time
              </span>
            </div>
            <motion.div
              animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className="bg-red-500/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-red-500/30"
            >
              <span className={`text-lg font-mono font-bold ${isUrgent ? "text-red-400" : "text-white"}`}>
                {formatTime(secondsLeft)}
              </span>
            </motion.div>
          </div>

          {/* Timer progress bar */}
          <div className="relative h-1 bg-white/5 rounded-full overflow-hidden mb-4">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500 to-red-400"
              animate={{ width: `${percentLeft}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Preview thumbnail */}
          {previewImageUrl && (
            <div className="relative h-32 rounded-xl overflow-hidden mb-3 border border-white/10">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${previewImageUrl})`,
                  filter: "blur(10px) brightness(0.4)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                  <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Title + pricing */}
          <h3 className="text-white font-bold text-[15px] leading-tight">{title}</h3>
          {subtitle && <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>}

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-white/30 text-sm line-through">${originalPrice.toFixed(2)}</span>
            <span className="text-white font-bold text-xl">${promoPrice.toFixed(2)}</span>
            <span className="text-green-400 text-xs font-semibold bg-green-400/10 px-2 py-0.5 rounded-full">
              {savings}% OFF
            </span>
          </div>

          {/* CTA with red pulse glow */}
          <button
            onClick={onClaim}
            onTouchStart={() => setPressing(true)}
            onTouchEnd={() => setPressing(false)}
            className="w-full mt-3 py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              boxShadow: pressing
                ? "0 0 40px rgba(239, 68, 68, 0.6)"
                : isUrgent
                  ? "0 0 25px rgba(239, 68, 68, 0.4)"
                  : "0 0 15px rgba(239, 68, 68, 0.25)",
            }}
          >
            {secondsLeft === 0 ? "Expired" : ctaText}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
