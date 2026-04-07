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
    <div className="my-3">
      {/* Tab toggle */}
      <div className="flex items-center gap-2 px-4 mb-3">
        <button
          onClick={() => setActiveTab("photos")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === "photos"
              ? "text-white"
              : "bg-transparent text-white/40 hover:text-white/60"
          }`}
          style={
            activeTab === "photos"
              ? { background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }
              : undefined
          }
        >
          Photos
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "videos"
              ? "text-white"
              : "bg-transparent text-white/40 hover:text-white/60"
          }`}
          style={
            activeTab === "videos"
              ? { background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }
              : undefined
          }
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Videos
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {filteredItems.length === 0 && (
          <div className="flex-shrink-0 w-full text-center py-6 text-white/30 text-sm">
            No {activeTab} available yet
          </div>
        )}
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.locked && onUnlock?.(item.id)}
            className="flex-shrink-0 w-36 group"
          >
            {/* Card */}
            <div className="relative w-36 h-48 rounded-xl overflow-hidden border border-white/10">
              {/* Blurred background image */}
              <div
                className="absolute inset-0 bg-[#2A2A3E] bg-cover bg-center"
                style={
                  item.thumbnailUrl
                    ? {
                        backgroundImage: `url(${item.thumbnailUrl})`,
                        filter: item.locked ? "blur(16px) brightness(0.5)" : "none",
                      }
                    : undefined
                }
              />

              {/* Lock overlay */}
              {item.locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  {/* Lock icon circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                    }}
                  >
                    <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>

                  {/* Price badge */}
                  <div
                    className="px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg shadow-purple-500/30"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Title below card */}
            <p className="text-white/60 text-xs mt-1.5 truncate text-center group-hover:text-white/80 transition-colors">
              {item.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
