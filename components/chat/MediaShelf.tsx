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
  // ── Source image (measured): 853 × 1844 ──
  const SRC_W = 853;
  const SRC_H = 1844;

  // ── Pill strip region (calibrated) ──
  // Adjust these pixel coords if the strip looks off.
  const PILL_LEFT_PX = 50;
  const PILL_RIGHT_PX = 803;
  const PILL_TOP_PX = 220;
  const PILL_BOTTOM_PX = 460;

  const stripW = PILL_RIGHT_PX - PILL_LEFT_PX;
  const stripH = PILL_BOTTOM_PX - PILL_TOP_PX;

  // Display bar — natural aspect of the strip
  const BAR_HEIGHT = 80;
  const barWidth = Math.round(BAR_HEIGHT * (stripW / stripH));

  // Background math (same pattern as PremiumMomentCard)
  const scale = barWidth / stripW;
  const bgW = Math.round(SRC_W * scale);
  const bgH = Math.round(SRC_H * scale);
  const bgX = -Math.round(PILL_LEFT_PX * scale);
  const bgY = -Math.round(PILL_TOP_PX * scale);

  return (
    <div className="flex justify-center pt-3 pb-2">
      <div
        className="relative"
        style={{
          height: `${BAR_HEIGHT}px`,
          width: `${barWidth}px`,
          backgroundImage: "url(/Moments-cards2.png)",
          backgroundSize: `${bgW}px ${bgH}px`,
          backgroundPosition: `${bgX}px ${bgY}px`,
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Click target — Photos pill (left ~half of strip) */}
        <button
          onClick={() => onSelect("photos")}
          aria-label="Show photos"
          className="absolute z-10 transition-all active:scale-95 rounded-full"
          style={{
            left: "4%",
            width: "44%",
            top: "12%",
            height: "76%",
            background: "transparent",
            boxShadow:
              activeTab !== "photos"
                ? "inset 0 0 0 999px rgba(0,0,0,0.45)"
                : "none",
          }}
        />

        {/* Click target — Videos pill (right ~half of strip) */}
        <button
          onClick={() => onSelect("videos")}
          aria-label="Show videos"
          className="absolute z-10 transition-all active:scale-95 rounded-full"
          style={{
            left: "52%",
            width: "44%",
            top: "12%",
            height: "76%",
            background: "transparent",
            boxShadow:
              activeTab !== "videos"
                ? "inset 0 0 0 999px rgba(0,0,0,0.45)"
                : "none",
          }}
        />
      </div>
    </div>
  );
}
