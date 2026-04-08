"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

interface BundleItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  price: number;
  imageCount?: number;
  isBestValue?: boolean;
}

interface Props {
  title: string;
  items: BundleItem[];
  onItemSelect: (itemId: string) => void;
  onDismiss: () => void;
}

export default function BundleRail({
  title,
  items,
  onItemSelect,
  onDismiss,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="my-3 -mx-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
          <h3 className="text-white font-bold text-[14px]">{title}</h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/30 hover:text-white/60 transition-colors text-xs"
        >
          Hide
        </button>
      </div>

      {/* Netflix-style horizontal scroll rail */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x snap-mandatory"
      >
        {items.map((item, idx) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => onItemSelect(item.id)}
            className="flex-shrink-0 snap-start group relative"
          >
            {/* Card */}
            <div className="relative w-32 h-44 rounded-xl overflow-hidden border border-white/10 bg-[#1E1E30]">
              {/* Image */}
              {item.thumbnailUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${item.thumbnailUrl})`,
                    filter: "blur(8px) brightness(0.4)",
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 to-[#1E1E30]" />
              )}

              {/* Best value badge */}
              {item.isBestValue && (
                <div className="absolute top-2 left-2 z-10">
                  <span
                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ background: "linear-gradient(135deg, #FF3CAC, #784BA0)" }}
                  >
                    Best Value
                  </span>
                </div>
              )}

              {/* Image count badge */}
              {item.imageCount && (
                <div className="absolute top-2 right-2 z-10 bg-black/50 backdrop-blur rounded-md px-1.5 py-0.5 flex items-center gap-1">
                  <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  </svg>
                  <span className="text-white text-[10px] font-semibold">{item.imageCount}</span>
                </div>
              )}

              {/* Lock + price center overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border border-white/20"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
                >
                  <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <span
                  className="text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg shadow-purple-500/30"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
                >
                  ${item.price.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Title */}
            <p className="text-white/60 text-[11px] mt-1.5 text-center truncate w-32 group-hover:text-white/80 transition-colors">
              {item.title}
            </p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
