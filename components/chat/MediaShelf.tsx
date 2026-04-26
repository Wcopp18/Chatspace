"use client";

import { useState } from "react";

interface MediaItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  price: number;
  mediaType: "photo" | "video";
  locked: boolean;
}

interface Props {
  items: MediaItem[];
  onUnlock?: (itemId: string) => void;
}

export default function MediaShelf({ items, onUnlock }: Props) {
  const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");

  const filteredItems = items.filter((item) =>
    activeTab === "photos" ? item.mediaType === "photo" : item.mediaType === "video"
  );

  return (
    <div
      className="flex-shrink-0 border-b border-white/5"
      style={{
        background: "linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(13,13,26,0) 100%)",
      }}
    >
      {/* Tab pills — uses Moments-cards2.png as the visual.
          Two transparent click targets cover the Photos/Videos pill regions. */}
      <ImageTabBar
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* Horizontal scroll row of unlocked / saved-for-later thumbnails */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="flex-shrink-0 w-full flex items-center justify-center py-6 text-white/30 text-xs italic">
            {activeTab === "photos"
              ? "Keep chatting to unlock her photos..."
              : "Keep chatting to unlock her videos..."}
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.locked && onUnlock?.(item.id)}
              className="flex-shrink-0 w-32 group"
            >
              {/* Card */}
              <div
                className="relative w-32 h-40 rounded-2xl overflow-hidden border"
                style={{
                  borderColor: "rgba(192, 132, 252, 0.3)",
                  boxShadow: "0 4px 20px rgba(168, 85, 247, 0.25)",
                }}
              >
                {/* Blurred background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={
                    item.thumbnailUrl
                      ? {
                          backgroundImage: `url(${item.thumbnailUrl})`,
                          filter: item.locked ? "blur(16px) brightness(0.7)" : "none",
                        }
                      : {
                          background:
                            "linear-gradient(135deg, #9F7AEA 0%, #B794F4 50%, #D6BCFA 100%)",
                        }
                  }
                />

                {/* Lavender overlay for locked items */}
                {item.locked && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(159, 122, 234, 0.4) 0%, rgba(183, 148, 244, 0.3) 100%)",
                    }}
                  />
                )}

                {/* Lock overlay */}
                {item.locked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    {/* Lock icon circle */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/40"
                      style={{
                        background: "linear-gradient(135deg, #9810fa 0%, #e60076 100%)",
                      }}
                    >
                      <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>

                    {/* Price badge */}
                    <div
                      className="px-3 py-1 rounded-full text-white text-[11px] font-bold shadow-lg shadow-pink-500/40"
                      style={{
                        background: "linear-gradient(135deg, #9810fa 0%, #e60076 100%)",
                      }}
                    >
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Video play indicator */}
                {!item.locked && item.mediaType === "video" && (
                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <svg width="10" height="10" fill="white" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Image-based tab bar — uses /Moments-cards2.png as the visual.
 *
 * The source image (~210 × 481) shows two illuminated pills (gold "Photos"
 * on the left, purple "Videos" on the right) near the top of a tall
 * purple canvas. We crop to just the pill strip and size the bar to
 * match the strip's natural aspect, then overlay two transparent
 * click targets on each pill.
 *
 * The non-active pill is dimmed slightly so the active state reads.
 */
function ImageTabBar({
  activeTab,
  onSelect,
}: {
  activeTab: "photos" | "videos";
  onSelect: (tab: "photos" | "videos") => void;
}) {
  return (
    <div className="flex justify-center gap-3 pt-3 pb-3 px-4">
      <PremiumTab
        label="Photos"
        theme="gold"
        active={activeTab === "photos"}
        onClick={() => onSelect("photos")}
      />
      <PremiumTab
        label="Videos"
        theme="purple"
        active={activeTab === "videos"}
        onClick={() => onSelect("videos")}
      />
    </div>
  );
}

/**
 * Eye-catching tab pill. Pure CSS — no asset dependencies.
 *
 * - Gold theme for Photos, Purple/electric theme for Videos.
 * - Lightning bolt icon to match the moment-card vibe.
 * - Glowing border + animated shine sweep + brightness pulse to
 *   draw the user's attention while they're chatting.
 * - Inactive state is muted but still themed (so both tabs feel
 *   "premium" and inviting).
 */
function PremiumTab({
  label,
  theme,
  active,
  onClick,
}: {
  label: string;
  theme: "gold" | "purple";
  active: boolean;
  onClick: () => void;
}) {
  const palette =
    theme === "gold"
      ? {
          gradient: "linear-gradient(135deg, #FFB800 0%, #FFD700 50%, #FFA500 100%)",
          glow: "rgba(255, 184, 0, 0.65)",
          glowSoft: "rgba(255, 184, 0, 0.35)",
          accent: "#FFD700",
          textActive: "#1a0d00",
          textInactive: "#FFD7A8",
          icon: "#1a0d00",
          iconInactive: "#FFD700",
        }
      : {
          gradient:
            "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 35%, #C084FC 70%, #6366F1 100%)",
          glow: "rgba(139, 92, 246, 0.65)",
          glowSoft: "rgba(139, 92, 246, 0.35)",
          accent: "#C084FC",
          textActive: "#ffffff",
          textInactive: "#D8B4FE",
          icon: "#ffffff",
          iconInactive: "#C084FC",
        };

  return (
    <button
      onClick={onClick}
      aria-label={`Show ${label.toLowerCase()}`}
      aria-pressed={active}
      className={`shine-sweep relative flex items-center gap-2 rounded-full font-bold tracking-wide transition-all active:scale-95 ${
        active ? "px-6 py-3 text-base" : "px-5 py-2.5 text-sm"
      }`}
      style={
        active
          ? {
              background: palette.gradient,
              color: palette.textActive,
              boxShadow: `
                0 0 0 1.5px rgba(255,255,255,0.35) inset,
                0 0 24px ${palette.glow},
                0 0 48px ${palette.glowSoft},
                0 6px 18px rgba(0,0,0,0.45)
              `,
              animation:
                "premiumPulse 1.8s ease-in-out infinite alternate",
            }
          : {
              background: "rgba(0, 0, 0, 0.5)",
              color: palette.textInactive,
              border: `1.5px solid ${palette.accent}80`,
              boxShadow: `0 0 14px ${palette.glowSoft}, 0 0 0 1px rgba(255,255,255,0.05) inset`,
            }
      }
    >
      {/* Lightning bolt icon */}
      <svg
        width="14"
        height="16"
        viewBox="0 0 14 16"
        fill="none"
        style={{
          color: active ? palette.icon : palette.iconInactive,
          filter: active
            ? "drop-shadow(0 0 4px rgba(255,255,255,0.4))"
            : `drop-shadow(0 0 6px ${palette.glow})`,
          flexShrink: 0,
        }}
      >
        <path
          d="M8 0 L1.5 9 L6 9 L4 16 L12.5 6 L7.5 6 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.4"
          strokeLinejoin="round"
        />
      </svg>

      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </button>
  );
}
