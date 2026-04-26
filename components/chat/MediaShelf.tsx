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
  // null = neither tab toggled on (default). Tapping a tab toggles it.
  const [activeTab, setActiveTab] = useState<"photos" | "videos" | null>(null);

  function toggleTab(tab: "photos" | "videos") {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }

  const filteredItems = activeTab
    ? items.filter((item) =>
        activeTab === "photos"
          ? item.mediaType === "photo"
          : item.mediaType === "video"
      )
    : [];

  return (
    <div
      className="flex-shrink-0 border-b border-white/5"
      style={{
        background: "linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(13,13,26,0) 100%)",
      }}
    >
      {/* Premium tab pills — toggleable; tapping the active tab turns it off */}
      <ImageTabBar activeTab={activeTab} onToggle={toggleTab} />

      {/* Horizontal scroll row — only renders when a tab is selected */}
      {activeTab && (
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
      )}
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
  onToggle,
}: {
  activeTab: "photos" | "videos" | null;
  onToggle: (tab: "photos" | "videos") => void;
}) {
  return (
    <div className="flex justify-center gap-4 pt-4 pb-4 px-4">
      <PremiumTab
        label="Photos"
        theme="gold"
        active={activeTab === "photos"}
        onClick={() => onToggle("photos")}
      />
      <PremiumTab
        label="Videos"
        theme="purple"
        active={activeTab === "videos"}
        onClick={() => onToggle("videos")}
      />
    </div>
  );
}

/**
 * 3D-styled tab pill. Three states:
 *
 * IDLE (no tab selected, this one not toggled) — fully illuminated in
 *   its theme color, with a continuous shimmer overlay, a glossy
 *   "dome" gradient (light top → dark bottom), inset top highlight +
 *   bottom shadow for depth, outer drop shadow lifting it off the
 *   page, and a strong colored glow halo. Subtle scale pulse so it
 *   pops and invites a tap.
 *
 * SELECTED — interior turns WHITE; the border keeps the theme color;
 *   colored glow halo stays. 3D treatment preserved (top highlight,
 *   bottom shadow, drop shadow). No shimmer — calm/clean.
 *
 * Gold theme = Photos. Purple theme = Videos.
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
          // Glossy dome gradient: bright top → mid → darker bottom.
          // The CSS shimmer overlay slides over this base.
          domeBg:
            "linear-gradient(180deg, #FFE066 0%, #FFD700 35%, #FFA500 75%, #CC8800 100%)",
          border: "#FFD700",
          glow: "rgba(255, 184, 0, 0.75)",
          glowSoft: "rgba(255, 184, 0, 0.4)",
          idleText: "#1a0d00",
          idleIcon: "#1a0d00",
          activeText: "#7A4A00",
          activeIcon: "#FFA500",
          // White on top simulates a gloss highlight
          activeDomeBg: "linear-gradient(180deg, #ffffff 0%, #f6f6f6 100%)",
        }
      : {
          domeBg:
            "linear-gradient(180deg, #C4B5FD 0%, #A78BFA 30%, #7C3AED 70%, #4C1D95 100%)",
          border: "#A78BFA",
          glow: "rgba(139, 92, 246, 0.75)",
          glowSoft: "rgba(139, 92, 246, 0.4)",
          idleText: "#ffffff",
          idleIcon: "#ffffff",
          activeText: "#5B21B6",
          activeIcon: "#7C3AED",
          activeDomeBg: "linear-gradient(180deg, #ffffff 0%, #f6f6f6 100%)",
        };

  // Bigger size for "pop"
  const sharedClasses =
    "relative flex items-center gap-2 rounded-full font-extrabold tracking-wide transition-transform active:scale-95 px-7 py-3 text-base";

  // 3D inset shadow: top highlight + bottom shadow simulates a domed surface.
  // Combined with a drop shadow it looks lifted off the page.
  const insetShadows =
    "inset 0 1.5px 0 rgba(255,255,255,0.65), inset 0 -2px 4px rgba(0,0,0,0.35)";

  if (active) {
    // ── SELECTED: white domed interior, colored border, colored glow ──
    return (
      <button
        onClick={onClick}
        aria-label={`Hide ${label.toLowerCase()}`}
        aria-pressed={true}
        className={sharedClasses}
        style={{
          backgroundImage: palette.activeDomeBg,
          color: palette.activeText,
          border: `2.5px solid ${palette.border}`,
          boxShadow: `
            ${insetShadows},
            0 4px 12px rgba(0,0,0,0.4),
            0 8px 24px rgba(0,0,0,0.25),
            0 0 24px ${palette.glow},
            0 0 48px ${palette.glowSoft}
          `,
        }}
      >
        <LightningIcon color={palette.activeIcon} glowColor={palette.glow} />
        <span>{label}</span>
      </button>
    );
  }

  // ── IDLE: 3D dome in theme color + continuous shimmer overlay + scale pulse ──
  return (
    <button
      onClick={onClick}
      aria-label={`Show ${label.toLowerCase()}`}
      aria-pressed={false}
      className={`${sharedClasses} shimmer-overlay animate-pop-pulse`}
      style={{
        backgroundImage: palette.domeBg,
        color: palette.idleText,
        border: `2px solid ${palette.border}`,
        boxShadow: `
          ${insetShadows},
          0 6px 16px rgba(0,0,0,0.55),
          0 12px 28px rgba(0,0,0,0.3),
          0 0 24px ${palette.glow},
          0 0 48px ${palette.glowSoft}
        `,
      }}
    >
      <LightningIcon color={palette.idleIcon} />
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </button>
  );
}

function LightningIcon({
  color,
  glowColor,
}: {
  color: string;
  glowColor?: string;
}) {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      fill="none"
      style={{
        color,
        filter: glowColor
          ? `drop-shadow(0 0 6px ${glowColor})`
          : "drop-shadow(0 0 3px rgba(255,255,255,0.35))",
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
  );
}
