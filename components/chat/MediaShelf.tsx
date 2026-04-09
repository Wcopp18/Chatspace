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

  const photoCount = items.filter((i) => i.mediaType === "photo").length;
  const videoCount = items.filter((i) => i.mediaType === "video").length;

  return (
    <div
      className="flex-shrink-0 border-b border-white/5"
      style={{
        background: "linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(13,13,26,0) 100%)",
      }}
    >
      {/* Tab toggle — always visible */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button
          onClick={() => setActiveTab("photos")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "photos"
              ? "text-white shadow-lg shadow-purple-500/30"
              : "text-white/50 hover:text-white/70 bg-white/5 border border-white/10"
          }`}
          style={
            activeTab === "photos"
              ? { background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }
              : undefined
          }
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          Photos
          {photoCount > 0 && (
            <span className={`text-[10px] ${activeTab === "photos" ? "text-white/70" : "text-white/30"}`}>
              {photoCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "videos"
              ? "text-white shadow-lg shadow-purple-500/30"
              : "text-white/50 hover:text-white/70 bg-white/5 border border-white/10"
          }`}
          style={
            activeTab === "videos"
              ? { background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }
              : undefined
          }
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Videos
          {videoCount > 0 && (
            <span className={`text-[10px] ${activeTab === "videos" ? "text-white/70" : "text-white/30"}`}>
              {videoCount}
            </span>
          )}
        </button>
      </div>

      {/* Horizontal scroll row */}
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
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                      }}
                    >
                      <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>

                    {/* Price badge */}
                    <div
                      className="px-3 py-1 rounded-full text-white text-[11px] font-bold shadow-lg shadow-purple-500/40"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
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
