"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Database } from "@/types/database";

type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface Props {
  moment: Moment | null;
  personaName: string;
  onDismiss: () => void;
}

const REVEAL_DURATION_MS = 5000;

/**
 * Full-screen centered popup that appears for ~5 seconds when the girl
 * "sends" a new moment in chat. Auto-dismisses, can be tapped to close
 * early. Mobile-first.
 *
 * Photos = gold/lightning theme.
 * Videos = purple/blue lightning theme.
 */
export default function MomentRevealModal({ moment, personaName, onDismiss }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!moment) return;
    setProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / REVEAL_DURATION_MS, 1);
      setProgress(pct);
      if (pct >= 1) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [moment, onDismiss]);

  if (!moment) return null;

  const isVideo = moment.media_type === "video";
  const accentPrimary = isVideo ? "#9810fa" : "#FFB800";
  const accentSecondary = isVideo ? "#155dfc" : "#FFD700";
  const accentGlow = isVideo
    ? "rgba(152, 16, 250, 0.6)"
    : "rgba(255, 184, 0, 0.65)";
  const ctaLabel = isVideo ? "Watch Now" : "Reveal Photo";
  const headline = isVideo
    ? "Exclusive Video"
    : "Exclusive Image";
  const subline = isVideo
    ? "Private clip she recorded just for you 😉"
    : `${personaName} has sent you something special...`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(8px)" }}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-[340px] flex flex-col items-center gap-3 animate-moment-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Headline */}
        <div className="text-center">
          <h2
            className="text-xl font-bold flex items-center justify-center gap-2"
            style={{ color: accentSecondary }}
          >
            {headline}
            <span style={{ filter: `drop-shadow(0 0 8px ${accentGlow})` }}>
              {isVideo ? "⚡" : "✨"}
            </span>
          </h2>
          <p className="text-white/80 text-sm mt-1">{subline}</p>
        </div>

        {/* Premium card */}
        <div
          className="relative w-full rounded-3xl overflow-hidden animate-premium-pulse"
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            boxShadow: `0 0 50px ${accentGlow}, 0 0 100px ${accentGlow}, 0 0 0 2px ${accentPrimary}`,
          }}
        >
          {/* Lightning corner accents */}
          <LightningAccents color={accentSecondary} />

          {/* Blurred preview */}
          <div className="relative aspect-square overflow-hidden">
            {moment.thumbnail_url ? (
              <Image
                src={moment.thumbnail_url}
                alt=""
                fill
                className="object-cover blur-xl scale-110 brightness-75"
                unoptimized
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, #2a1248 0%, #160828 100%)",
                }}
              />
            )}
            {/* Dark vignette */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)",
              }}
            />

            {/* Lock icon top-right */}
            <div
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accentPrimary} 0%, ${accentSecondary} 100%)`,
                boxShadow: `0 0 20px ${accentGlow}`,
              }}
            >
              {isVideo ? (
                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
            </div>

            {/* Center play/lock icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentPrimary} 0%, ${accentSecondary} 100%)`,
                  boxShadow: `0 0 40px ${accentGlow}, 0 0 80px ${accentGlow}`,
                }}
              >
                {isVideo ? (
                  <svg
                    width="32"
                    height="32"
                    fill="white"
                    viewBox="0 0 24 24"
                    style={{ marginLeft: "4px" }}
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg
                    width="30"
                    height="30"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                )}
              </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-3 left-4 right-4 text-center">
              <p
                className="text-base font-semibold"
                style={{ color: accentSecondary }}
              >
                {moment.title}
              </p>
              <p className="text-white/85 text-[12px] mt-0.5">
                {moment.tease_copy || "while thinking of you 💜"}
              </p>
            </div>
          </div>

          {/* CTA bar */}
          <div className="p-4 pt-3">
            <div
              className="w-full rounded-2xl flex items-center justify-center gap-2 py-3.5"
              style={{
                background: `linear-gradient(135deg, ${accentPrimary} 0%, ${accentSecondary} 100%)`,
                boxShadow: `0 4px 24px ${accentGlow}, 0 0 0 1px rgba(255,255,255,0.2) inset`,
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="text-black font-bold text-base">{ctaLabel}</span>
            </div>
            <p
              className="text-center font-bold text-lg mt-2"
              style={{ color: accentSecondary }}
            >
              ${moment.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* 5-second progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-[width] duration-[50ms] ease-linear"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${accentPrimary}, ${accentSecondary})`,
              boxShadow: `0 0 8px ${accentGlow}`,
            }}
          />
        </div>
        <p className="text-white/40 text-[11px]">tap anywhere to dismiss</p>
      </div>

    </div>
  );
}

/** Decorative lightning bolts at corners */
function LightningAccents({ color }: { color: string }) {
  return (
    <>
      {/* Top-left bolt */}
      <svg
        className="absolute top-2 left-2 pointer-events-none"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
          opacity: 0.85,
        }}
      >
        <path
          d="M18 2 L8 22 L16 22 L12 38 L26 14 L18 14 Z"
          fill={color}
          opacity="0.9"
        />
      </svg>
      {/* Top-right bolt */}
      <svg
        className="absolute top-2 right-2 pointer-events-none"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
          opacity: 0.7,
          transform: "scaleX(-1)",
        }}
      >
        <path
          d="M18 2 L8 22 L16 22 L12 38 L26 14 L18 14 Z"
          fill={color}
          opacity="0.9"
        />
      </svg>
      {/* Bottom-left bolt */}
      <svg
        className="absolute bottom-2 left-2 pointer-events-none"
        width="32"
        height="32"
        viewBox="0 0 40 40"
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
          opacity: 0.7,
          transform: "rotate(180deg)",
        }}
      >
        <path
          d="M18 2 L8 22 L16 22 L12 38 L26 14 L18 14 Z"
          fill={color}
          opacity="0.9"
        />
      </svg>
      {/* Bottom-right bolt */}
      <svg
        className="absolute bottom-2 right-2 pointer-events-none"
        width="32"
        height="32"
        viewBox="0 0 40 40"
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
          opacity: 0.85,
          transform: "rotate(180deg) scaleX(-1)",
        }}
      >
        <path
          d="M18 2 L8 22 L16 22 L12 38 L26 14 L18 14 Z"
          fill={color}
          opacity="0.9"
        />
      </svg>
    </>
  );
}
