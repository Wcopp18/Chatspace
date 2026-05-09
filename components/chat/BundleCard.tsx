"use client";

import { useState } from "react";

interface BundleCardProps {
  id: string;
  title: string;
  introLine: string;
  price: number;
  itemCount: number;
  thumbnailUrl: string | null;
  conversationId: string | null;
  onUnlock: (bundleId: string) => Promise<void>;
}

/**
 * In-chat bundle offer card. Shows blurred thumbnail of the first photo,
 * item count, transparent price, and one-tap unlock. The girl never says
 * the price — this card carries it.
 */
export default function BundleCard({
  id,
  title,
  introLine,
  price,
  itemCount,
  thumbnailUrl,
  onUnlock,
}: BundleCardProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleUnlock() {
    if (busy || done) return;
    setBusy(true);
    try {
      await onUnlock(id);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#FF3CAC]/15 to-[#8B5CF6]/15 border border-[#FF3CAC]/30 p-3 text-center text-white/80 text-sm">
        ✓ unlocked
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-[#FF3CAC]/30 bg-gradient-to-br from-[#1E1E30] to-[#0D0D1A] shadow-lg">
      {/* Thumbnail strip */}
      <div className="relative aspect-[16/10] bg-[#252538]">
        {thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="text-[10px] uppercase tracking-widest text-white/60 mb-1">
            {itemCount} more
          </div>
          <div className="text-base font-bold">{title}</div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {introLine && (
          <p className="text-white/70 text-sm italic leading-snug">"{introLine}"</p>
        )}
        <button
          onClick={handleUnlock}
          disabled={busy}
          className="w-full gradient-bg text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60"
        >
          {busy ? "unlocking…" : `See all ${itemCount} — $${price.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
