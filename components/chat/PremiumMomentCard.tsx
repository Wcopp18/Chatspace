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
 * Uses /public/moment-cards.png as the visual (one big PNG with 4 cards).
 * Crops to a single card via CSS background-image + background-size +
 * background-position. Bypasses Tailwind's <img> preflight rules, so the
 * sizing is completely under our control.
 *
 * Photos = gold card (top-left of source image).
 * Videos = purple card (bottom-left of source image).
 *
 * Click targets are layered on top for unlock + (chat-only) dismiss.
 */
export default function PremiumMomentCard({
  theme,
  onCtaClick,
  onDismissClick,
  busy,
  compact = false,
}: Props) {
  // ── Source image dimensions (measured) ──
  const SRC_W = 1086;
  const SRC_H = 1448;

  // ── Card region within the source image (calibrated by inspection) ──
  // Pixel coords for the LEFT card on each row.
  // Adjust these if the crop looks off — they're the only knobs.
  const CARD_LEFT_PX = 25;       // x of card's left edge (incl. lightning bleed)
  const CARD_RIGHT_PX = 545;     // x of card's right edge
  const GOLD_TOP_PX = 200;       // y of gold card's top edge
  const GOLD_BOTTOM_PX = 730;    // y of gold card's bottom edge
  const PURPLE_TOP_PX = 870;     // y of purple card's top edge
  const PURPLE_BOTTOM_PX = 1340; // y of purple card's bottom edge

  const cardW = CARD_RIGHT_PX - CARD_LEFT_PX;
  const cardH =
    theme === "gold"
      ? GOLD_BOTTOM_PX - GOLD_TOP_PX
      : PURPLE_BOTTOM_PX - PURPLE_TOP_PX;
  const cardTop = theme === "gold" ? GOLD_TOP_PX : PURPLE_TOP_PX;

  // ── Display container ──
  // We pick a display width and let height match the card's natural aspect.
  const displayWidth = compact ? 260 : 300;
  const displayHeight = Math.round(displayWidth * (cardH / cardW));

  // ── Background scaling math ──
  // We want the source `cardW × cardH` region to fill `displayWidth × displayHeight`.
  // Scale factor:
  const scale = displayWidth / cardW;
  // Scaled full image dimensions:
  const bgWidth = Math.round(SRC_W * scale);
  const bgHeight = Math.round(SRC_H * scale);
  // Background offset: shift image up/left so card-region top-left lands at 0,0.
  const bgPosX = -Math.round(CARD_LEFT_PX * scale);
  const bgPosY = -Math.round(cardTop * scale);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        backgroundImage: "url(/moment-cards.png)",
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Transparent click target over the unlock button.
          Approx region within the cropped card: x 6%-94%, y 73%-84% */}
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
