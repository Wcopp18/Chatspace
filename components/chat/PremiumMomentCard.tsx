"use client";

export type PremiumTheme = "gold" | "purple";

interface Props {
  theme: PremiumTheme;
  thumbnailUrl?: string | null;
  price?: number;
  onCtaClick?: () => void;
  onDismissClick?: () => void;
  busy?: boolean;
  compact?: boolean;
}

/**
 * In-chat moment card. Heavily blurred thumbnail behind a glow border with a
 * centered REVEAL (photo) / WATCH (video) CTA. Photos = gold, videos = purple.
 */
export default function PremiumMomentCard({
  theme,
  thumbnailUrl,
  price,
  onCtaClick,
  onDismissClick,
  busy,
  compact = false,
}: Props) {
  const isVideo = theme === "purple";

  const accent = isVideo
    ? { border: "#A855F7", glow: "rgba(168, 85, 247, 0.55)", soft: "rgba(168, 85, 247, 0.25)" }
    : { border: "#F5A524", glow: "rgba(245, 165, 36, 0.55)", soft: "rgba(245, 165, 36, 0.25)" };

  const ctaLabel = isVideo ? "WATCH" : "REVEAL";
  const width = compact ? 240 : 280;
  const height = Math.round(width * 1.35);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: `2px solid ${accent.border}`,
        boxShadow: `0 0 24px ${accent.glow}, 0 0 60px ${accent.soft}, inset 0 0 24px ${accent.soft}`,
        background: "#0A0612",
      }}
    >
      {thumbnailUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${thumbnailUrl})`,
            filter: "blur(28px) brightness(0.35) saturate(0.9)",
            transform: "scale(1.15)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: isVideo
              ? "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.35), rgba(20,5,40,0.95))"
              : "radial-gradient(circle at 50% 50%, rgba(245,165,36,0.30), rgba(30,15,5,0.95))",
            filter: "blur(8px)",
          }}
        />
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {onDismissClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismissClick();
          }}
          aria-label="Save for later"
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <button
        onClick={onCtaClick}
        disabled={busy}
        aria-label={ctaLabel}
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 disabled:opacity-60"
        style={{ cursor: busy ? "wait" : "pointer" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${accent.border} 0%, ${accent.glow} 100%)`,
            boxShadow: `0 0 24px ${accent.glow}`,
          }}
        >
          {isVideo ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          )}
        </div>

        <div
          className="text-white font-extrabold tracking-[0.2em] text-sm"
          style={{ textShadow: `0 0 12px ${accent.glow}` }}
        >
          {ctaLabel}
        </div>

        {typeof price === "number" && price > 0 && (
          <div
            className="px-3 py-1 rounded-full text-white text-xs font-bold"
            style={{
              background: "rgba(0,0,0,0.55)",
              border: `1px solid ${accent.border}`,
              boxShadow: `0 0 10px ${accent.soft}`,
            }}
          >
            ${price.toFixed(2)}
          </div>
        )}
      </button>

      {busy && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
          <span className="text-white text-sm font-bold">Unlocking…</span>
        </div>
      )}
    </div>
  );
}
