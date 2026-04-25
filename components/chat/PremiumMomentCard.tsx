"use client";

export type PremiumTheme = "gold" | "purple";

interface Props {
  theme: PremiumTheme;
  /** Optional click handler for the "Reveal Photo / Watch Now" button area. */
  onCtaClick?: () => void;
  /** Optional click handler for the small × dismiss button (chat-only). */
  onDismissClick?: () => void;
  busy?: boolean;
  /** Compact size for in-chat rendering. Default false = modal size. */
  compact?: boolean;
}

/**
 * Premium "lightning" moment card.
 *
 * Uses the AI-rendered /moment-cards.png as its visual. The image contains
 * 4 cards (gold left, gold right, purple left, purple right) plus headers
 * and a "Go Premium" footer. We crop to one card via positioned <img>
 * inside an overflow-hidden container.
 *
 * Photos = gold card (top-left of the source image).
 * Videos = purple card (bottom-left of the source image).
 *
 * NOTE: title, tease copy, button label, and price are baked into the
 * image (intentional MVP trade-off for visual fidelity). Click targets
 * are overlaid on top of the button region for unlock interactions.
 */
export default function PremiumMomentCard({
  theme,
  onCtaClick,
  onDismissClick,
  busy,
  compact = false,
}: Props) {
  // Card display dimensions. The source card region is roughly square
  // (49% wide × 36% tall of a 1086×1448 image → 532 × 521 pixels).
  const width = compact ? 260 : 300;
  // Container height is computed from the source card aspect:
  // height = width × (cardH_pct × srcH) / (cardW_pct × srcW)
  // For 49%×36% of 1086×1448 → ratio ≈ 0.98 (basically square).
  const height = Math.round(width * 0.98);

  // ── source image cropping ──
  // moment-cards.png contains 4 cards in a 2x2 grid plus headers + footer.
  // These percentages are calibrated by inspection.
  //
  // Image regions (approx):
  //   Top tabs strip:          y 0% – 7%
  //   "Exclusive Images" hdr:  y 7% – 14%
  //   Gold cards row:          y 14% – 51%
  //   "Exclusive Videos" hdr:  y 51% – 58%
  //   Purple cards row:        y 58% – 92%
  //   "Go Premium" footer:     y 92% – 100%
  //
  // We crop to the LEFT card of the matching row.
  const SRC_CARD_X_PCT = 1;      // a sliver of left padding
  const SRC_CARD_W_PCT = 47;     // width of one card (incl lightning bleed)
  const SRC_GOLD_Y_PCT = 13;
  const SRC_PURPLE_Y_PCT = 56.5;
  const SRC_CARD_H_PCT = 38;     // height of one card (incl lightning bleed)

  const srcYPct = theme === "gold" ? SRC_GOLD_Y_PCT : SRC_PURPLE_Y_PCT;

  // To make the source `SRC_CARD_W_PCT%` slice fill our container width,
  // the displayed <img> must be `(100 / SRC_CARD_W_PCT)` × the container
  // width, then offset left by `SRC_CARD_X_PCT%` of the displayed image.
  const imgScale = 100 / SRC_CARD_W_PCT; // ≈ 2.13×
  const imgWidth = Math.round(width * imgScale);
  // Source aspect: actual 1086 × 1448 → height/width = 1.333
  const SRC_ASPECT_HW = 1448 / 1086;
  const imgHeight = Math.round(imgWidth * SRC_ASPECT_HW);

  const imgLeft = -Math.round((SRC_CARD_X_PCT / 100) * imgWidth);
  const imgTop = -Math.round((srcYPct / 100) * imgHeight);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* The premium card visual (cropped from moment-cards.png).
          maxWidth:none/maxHeight:none override Tailwind preflight,
          which would otherwise cap us to the container size. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/moment-cards.png"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          width: `${imgWidth}px`,
          height: `${imgHeight}px`,
          maxWidth: "none",
          maxHeight: "none",
          left: `${imgLeft}px`,
          top: `${imgTop}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
        draggable={false}
      />

      {/* Transparent click target over the unlock button.
          Approx region within the cropped card:
            x: ~6% – 94%, y: ~73% – 84% */}
      {onCtaClick && (
        <button
          onClick={onCtaClick}
          disabled={busy}
          aria-label="Unlock"
          className="absolute rounded-full transition-all active:scale-[0.97] disabled:opacity-60"
          style={{
            left: "6%",
            right: "6%",
            top: "73%",
            height: "11%",
            background: "transparent",
            cursor: busy ? "wait" : "pointer",
          }}
        />
      )}

      {/* In-chat dismiss button (top-left). Modal version doesn't show this. */}
      {onDismissClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismissClick();
          }}
          aria-label="Save for later"
          className="absolute w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ left: "5%", top: "4%" }}
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
      )}

      {busy && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
          <span className="text-white text-sm font-bold">Unlocking…</span>
        </div>
      )}
    </div>
  );
}
