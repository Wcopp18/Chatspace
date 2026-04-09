"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  headline: string;
  subtitle?: string;
  previewImageUrl?: string | null;
  ctaText: string;
  price?: number;
  onUnlock: () => void;
  onDismiss: () => void;
}

export default function MediaTeaserCard({
  headline,
  subtitle,
  previewImageUrl,
  ctaText,
  price,
  onUnlock,
  onDismiss,
}: Props) {
  const [pressing, setPressing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="my-3 mx-1"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/[0.04]">
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />

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

        {/* Preview image */}
        <div className="relative h-44 overflow-hidden">
          {previewImageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${previewImageUrl})`,
                filter: "blur(12px) brightness(0.5)",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-pink-900/40" />
          )}

          {/* Lock overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
          </div>

          {/* Private badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-[11px] font-medium text-white/90">Private</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 relative">
          <h3 className="text-white font-bold text-[15px] leading-tight">
            {headline}
          </h3>
          {subtitle && (
            <p className="text-white/50 text-sm mt-1">{subtitle}</p>
          )}

          {/* CTA button with glow */}
          <button
            onClick={onUnlock}
            onTouchStart={() => setPressing(true)}
            onTouchEnd={() => setPressing(false)}
            className="w-full mt-3 py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #FF3CAC 0%, #784BA0 50%, #2B86C5 100%)",
              boxShadow: pressing
                ? "0 0 30px rgba(255, 60, 172, 0.5)"
                : "0 0 20px rgba(255, 60, 172, 0.3), 0 0 60px rgba(255, 60, 172, 0.1)",
            }}
          >
            {ctaText}{price ? ` - $${price.toFixed(2)}` : ""}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
