"use client";

import Image from "next/image";

export type PremiumTheme = "gold" | "purple";

interface ThemeColors {
  primary: string;   // dominant accent
  secondary: string; // lighter accent (gradient end)
  glow: string;      // rgba shadow
  bolt: string;      // bolt outer color
  cta: "black" | "white"; // text color over CTA gradient
}

const THEMES: Record<PremiumTheme, ThemeColors> = {
  gold: {
    primary: "#FFB800",
    secondary: "#FFD700",
    glow: "rgba(255, 184, 0, 0.7)",
    bolt: "#FFC400",
    cta: "black",
  },
  purple: {
    primary: "#9810fa",
    secondary: "#155dfc",
    glow: "rgba(152, 16, 250, 0.65)",
    bolt: "#C77DFF",
    cta: "white",
  },
};

interface Props {
  theme: PremiumTheme;
  title: string;
  teaseCopy: string;
  price: number;
  thumbnailUrl: string | null;
  ctaLabel: string;
  onCtaClick?: () => void;
  onDismissClick?: () => void;
  busy?: boolean;
  /** Compact size for in-chat rendering. Default false = modal size. */
  compact?: boolean;
}

/**
 * Premium "lightning blast" card used by both the in-chat MomentCard
 * and the centered MomentRevealModal. Gold theme for photos, purple
 * theme for videos.
 *
 * Visual:
 * - Dark backdrop with the blurred preview behind a vignette
 * - Glowing themed border + halo
 * - Lightning bolt SVG paths radiating from the LEFT and RIGHT edges
 * - Small lock chip top-right, optional dismiss button top-left
 * - Big concentric "lock ring" centered
 * - Title + tease copy under preview
 * - Themed gradient CTA pill with bolt-tip sparks
 * - Price below
 */
export default function PremiumMomentCard({
  theme,
  title,
  teaseCopy,
  price,
  thumbnailUrl,
  ctaLabel,
  onCtaClick,
  onDismissClick,
  busy,
  compact = false,
}: Props) {
  const c = THEMES[theme];
  const width = compact ? 260 : 300;
  const previewHeight = compact ? 200 : 280;

  return (
    <div
      className="relative"
      style={{ width: `${width}px` }}
    >
      {/* Lightning blast overlay (extends past card edges) */}
      <LightningBlast colors={c} />

      {/* Card itself */}
      <div
        className="relative rounded-[28px] overflow-hidden"
        style={{
          background: "rgba(0, 0, 0, 0.7)",
          boxShadow: `0 0 30px ${c.glow}, 0 0 60px ${c.glow}, 0 0 0 2px ${c.primary}`,
        }}
      >
        {/* Preview region */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: `${previewHeight}px` }}
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover blur-xl scale-110 brightness-75"
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #2a1248 0%, #160828 100%)",
              }}
            />
          )}
          {/* Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.75) 100%)",
            }}
          />

          {/* Top-right lock chip */}
          <div
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: c.primary,
              boxShadow: `0 0 12px ${c.glow}, 0 0 0 1px ${c.secondary} inset`,
            }}
          >
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>

          {/* Top-left dismiss */}
          {onDismissClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissClick();
              }}
              className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label="Save for later"
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

          {/* Center lock ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Outer halo */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: `0 0 40px ${c.glow}, 0 0 80px ${c.glow}`,
                }}
              />
              {/* Concentric rings */}
              <div
                className="relative rounded-full flex items-center justify-center"
                style={{
                  width: compact ? "60px" : "76px",
                  height: compact ? "60px" : "76px",
                  background: c.primary,
                  border: `3px solid ${c.secondary}`,
                  boxShadow: `0 0 24px ${c.glow} inset, 0 0 0 6px rgba(0,0,0,0.6)`,
                }}
              >
                <svg
                  width={compact ? "22" : "28"}
                  height={compact ? "22" : "28"}
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-3 pb-4 text-center">
          <p
            className="font-bold"
            style={{
              color: c.secondary,
              fontSize: compact ? "14px" : "16px",
              filter: `drop-shadow(0 0 4px ${c.glow})`,
            }}
          >
            {title}
          </p>
          <p className="text-white/85 text-[12px] mt-1 leading-tight">
            {teaseCopy}
          </p>

          {/* CTA */}
          <button
            onClick={onCtaClick}
            disabled={busy || !onCtaClick}
            className="relative mt-3 w-full rounded-full py-3 flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-70"
            style={{
              background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`,
              boxShadow: `0 4px 20px ${c.glow}, 0 0 0 1px rgba(255,255,255,0.25) inset`,
            }}
          >
            {/* Bolt tip — left of button */}
            <span
              className="absolute -left-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ filter: `drop-shadow(0 0 6px ${c.glow})` }}
            >
              <MiniBolt color={c.bolt} />
            </span>

            <svg
              width="14"
              height="14"
              fill="none"
              stroke={c.cta}
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span
              className="font-bold"
              style={{
                color: c.cta,
                fontSize: compact ? "14px" : "16px",
              }}
            >
              {busy ? "Unlocking..." : ctaLabel}
            </span>

            {/* Bolt tip — right of button */}
            <span
              className="absolute -right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                filter: `drop-shadow(0 0 6px ${c.glow})`,
                transform: "translateY(-50%) scaleX(-1)",
              }}
            >
              <MiniBolt color={c.bolt} />
            </span>
          </button>

          {/* Price */}
          <p
            className="font-bold mt-2"
            style={{
              color: c.secondary,
              fontSize: compact ? "14px" : "18px",
              filter: `drop-shadow(0 0 4px ${c.glow})`,
            }}
          >
            ${price.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Big lightning bolts radiating from card edges */
function LightningBlast({ colors }: { colors: ThemeColors }) {
  const filter = `drop-shadow(0 0 3px ${colors.glow}) drop-shadow(0 0 8px ${colors.glow}) drop-shadow(0 0 16px ${colors.glow})`;

  // Each "bolt" renders as outer colored stroke + inner white-hot core
  const Bolt = ({ d, w = 2.5 }: { d: string; w?: number }) => (
    <g style={{ filter }}>
      <path
        d={d}
        stroke={colors.bolt}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d={d}
        stroke="#FFFFEE"
        strokeWidth={Math.max(w - 1.5, 0.7)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
    </g>
  );

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 300 400"
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      {/* LEFT side bolts (extending out from x≈0) */}
      <Bolt d="M 10 60 L -18 78 L 4 88 L -28 110 L 0 122 M -18 78 L -32 70" w={3} />
      <Bolt d="M 8 160 L -25 174 L -2 188 L -34 208 L -8 220 M -25 174 L -38 168" w={2.6} />
      <Bolt d="M 10 250 L -16 264 L 0 278 L -22 296 M -16 264 L -30 258" w={2.4} />
      <Bolt d="M 12 330 L -10 346 L 6 358" w={2} />

      {/* RIGHT side bolts (mirrored, extending past x=300) */}
      <Bolt d="M 290 60 L 318 78 L 296 88 L 328 110 L 300 122 M 318 78 L 332 70" w={3} />
      <Bolt d="M 292 160 L 325 174 L 302 188 L 334 208 L 308 220 M 325 174 L 338 168" w={2.6} />
      <Bolt d="M 290 250 L 316 264 L 300 278 L 322 296 M 316 264 L 330 258" w={2.4} />
      <Bolt d="M 288 330 L 310 346 L 294 358" w={2} />

      {/* Tip sparks */}
      <g style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}>
        <circle cx="-32" cy="70" r="2" fill={colors.bolt} />
        <circle cx="-38" cy="168" r="2" fill={colors.bolt} />
        <circle cx="-30" cy="258" r="1.6" fill={colors.bolt} />
        <circle cx="332" cy="70" r="2" fill={colors.bolt} />
        <circle cx="338" cy="168" r="2" fill={colors.bolt} />
        <circle cx="330" cy="258" r="1.6" fill={colors.bolt} />
      </g>
    </svg>
  );
}

/** Tiny bolt for the CTA button ends */
function MiniBolt({ color }: { color: string }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
      <path
        d="M11 1 L4 12 L9 12 L7 21 L14 8 L9 8 Z"
        fill={color}
        stroke="#FFFFEE"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
