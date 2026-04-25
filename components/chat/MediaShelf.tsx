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
  const BAR_HEIGHT = 80;
  const SRC_PILL_Y_PCT = 11;
  const SRC_PILL_H_PCT = 22;
  const SRC_ASPECT_HW = 481 / 210; // image natural aspect (height / width)

  // Scale image so that SRC_PILL_H_PCT % of source height = BAR_HEIGHT.
  const scaledImgH = (BAR_HEIGHT * 100) / SRC_PILL_H_PCT;
  const scaledImgW = scaledImgH / SRC_ASPECT_HW;
  const imgTopOffset = -(SRC_PILL_Y_PCT / 100) * scaledImgH;

  return (
    <div className="flex justify-center pt-3 pb-2">
      <div
        className="relative overflow-hidden"
        style={{
          height: `${BAR_HEIGHT}px`,
          width: `${scaledImgW}px`,
        }}
      >
        {/* Cropped tab strip */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Moments-cards2.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            height: `${scaledImgH}px`,
            width: `${scaledImgW}px`,
            left: 0,
            top: `${imgTopOffset}px`,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />

        {/* Click target — Photos pill (left half of image) */}
        <button
          onClick={() => onSelect("photos")}
          aria-label="Show photos"
          className="absolute z-10 transition-all active:scale-95 rounded-full"
          style={{
            left: "6%",
            width: "42%",
            top: "12%",
            height: "76%",
            background: "transparent",
            boxShadow:
              activeTab !== "photos"
                ? "inset 0 0 0 999px rgba(0,0,0,0.45)"
                : "none",
          }}
        />

        {/* Click target — Videos pill (right half of image) */}
        <button
          onClick={() => onSelect("videos")}
          aria-label="Show videos"
          className="absolute z-10 transition-all active:scale-95 rounded-full"
          style={{
            left: "52%",
            width: "42%",
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
