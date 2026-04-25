"use client";

import { useState } from "react";
import Image from "next/image";
import { PRICING } from "@/lib/constants";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface Props {
  moment: Moment;
  persona: Persona;
  onDismiss: () => void;
  onUnlock: () => void;
}

/**
 * In-chat moment offer. Premium lightning look.
 * - Photos: gold theme
 * - Videos: purple/blue theme
 *
 * Appears as if the girl sent it. Taps "Reveal Photo" / "Watch Now"
 * to unlock; dismiss button (top-left) saves to the shelf for later.
 */
export default function MomentCard({ moment, persona, onDismiss, onUnlock }: Props) {
  const [unlocking, setUnlocking] = useState(false);
  const [showUnlocked, setShowUnlocked] = useState(moment.unlocked);

  const isVideo = moment.media_type === "video";
  const price = isVideo ? PRICING.VIDEO_UNLOCK : PRICING.IMAGE_UNLOCK;

  const accentPrimary = isVideo ? "#9810fa" : "#FFB800";
  const accentSecondary = isVideo ? "#155dfc" : "#FFD700";
  const accentGlow = isVideo
    ? "rgba(152, 16, 250, 0.55)"
    : "rgba(255, 184, 0, 0.6)";
  const ctaLabel = isVideo ? "Watch Now" : "Reveal Photo";

  async function handleUnlock() {
    setUnlocking(true);
    await onUnlock();
    setShowUnlocked(true);
    setUnlocking(false);
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] flex flex-col gap-1.5">
        {/* Premium card */}
        <div
          className="relative w-[280px] rounded-3xl overflow-hidden"
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            boxShadow: `0 0 30px ${accentGlow}, 0 0 0 2px ${accentPrimary}`,
          }}
        >
          {/* Lightning corners */}
          <LightningAccents color={accentSecondary} />

          {/* Preview image (blurred when locked) */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {moment.thumbnail_url ? (
              <Image
                src={moment.thumbnail_url}
                alt={moment.title}
                fill
                className={`object-cover ${
                  showUnlocked ? "" : "blur-xl scale-110 brightness-75"
                }`}
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

            {/* Vignette */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)",
              }}
            />

            {!showUnlocked && (
              <>
                {/* Lock chip top-right */}
                <div
                  className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${accentPrimary} 0%, ${accentSecondary} 100%)`,
                    boxShadow: `0 0 14px ${accentGlow}`,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>

                {/* Dismiss button top-left */}
                <button
                  onClick={onDismiss}
                  className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors"
                  aria-label="Save for later"
                >
                  <svg
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${accentPrimary} 0%, ${accentSecondary} 100%)`,
                      boxShadow: `0 0 30px ${accentGlow}, 0 0 60px ${accentGlow}`,
                    }}
                  >
                    {isVideo ? (
                      <svg
                        width="26"
                        height="26"
                        fill="white"
                        viewBox="0 0 24 24"
                        style={{ marginLeft: "3px" }}
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg
                        width="24"
                        height="24"
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
                <div className="absolute bottom-2 left-3 right-3 text-center">
                  <p
                    className="text-sm font-bold"
                    style={{ color: accentSecondary }}
                  >
                    {moment.title}
                  </p>
                  <p className="text-white/80 text-[11px] mt-0.5 leading-tight">
                    {moment.tease_copy ||
                      `${persona.display_name} made this for you`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* CTA section */}
          {!showUnlocked && (
            <div className="px-3 py-3">
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full rounded-2xl flex items-center justify-center gap-2 py-3 transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${accentPrimary} 0%, ${accentSecondary} 100%)`,
                  boxShadow: `0 4px 18px ${accentGlow}, 0 0 0 1px rgba(255,255,255,0.2) inset`,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke={isVideo ? "white" : "black"}
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span
                  className="font-bold text-sm"
                  style={{ color: isVideo ? "white" : "black" }}
                >
                  {unlocking ? "Unlocking..." : ctaLabel}
                </span>
              </button>
              <p
                className="text-center font-bold text-base mt-1.5"
                style={{ color: accentSecondary }}
              >
                ${price.toFixed(2)}
              </p>
            </div>
          )}

          {showUnlocked && (
            <div className="px-3 py-3 flex items-center justify-center gap-2 text-green-400 text-sm font-semibold">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              Unlocked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LightningAccents({ color }: { color: string }) {
  const bolt = (
    <path
      d="M18 2 L8 22 L16 22 L12 38 L26 14 L18 14 Z"
      fill={color}
      opacity="0.9"
    />
  );
  return (
    <>
      <svg
        className="absolute top-2 left-2 pointer-events-none"
        width="28"
        height="28"
        viewBox="0 0 40 40"
        style={{ filter: `drop-shadow(0 0 4px ${color})`, opacity: 0.8 }}
      >
        {bolt}
      </svg>
      <svg
        className="absolute top-2 right-2 pointer-events-none"
        width="28"
        height="28"
        viewBox="0 0 40 40"
        style={{
          filter: `drop-shadow(0 0 4px ${color})`,
          opacity: 0.65,
          transform: "scaleX(-1)",
        }}
      >
        {bolt}
      </svg>
      <svg
        className="absolute bottom-2 left-2 pointer-events-none"
        width="22"
        height="22"
        viewBox="0 0 40 40"
        style={{
          filter: `drop-shadow(0 0 4px ${color})`,
          opacity: 0.6,
          transform: "rotate(180deg)",
        }}
      >
        {bolt}
      </svg>
      <svg
        className="absolute bottom-2 right-2 pointer-events-none"
        width="22"
        height="22"
        viewBox="0 0 40 40"
        style={{
          filter: `drop-shadow(0 0 4px ${color})`,
          opacity: 0.75,
          transform: "rotate(180deg) scaleX(-1)",
        }}
      >
        {bolt}
      </svg>
    </>
  );
}
