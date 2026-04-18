"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  personaName: string;
  personaId: string;
  conversationId: string | null;
  chemistrySnapshot: {
    chemistryScore?: number;
    tensionScore?: number;
    relationshipMomentum?: number;
  };
  onSubscribed: () => void;
  onDismiss: () => void;
}

export default function FirstRevealPopup({
  personaName,
  personaId,
  conversationId,
  chemistrySnapshot,
  onSubscribed,
  onDismiss,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, conversationId, ...chemistrySnapshot }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong");
      }
      onSubscribed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  async function handleDismiss() {
    if (submitting) return;
    try {
      await fetch("/api/subscription/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, conversationId, ...chemistrySnapshot }),
      });
    } catch {
      // non-blocking — dismiss regardless
    }
    onDismiss();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at center, rgba(30, 8, 50, 0.92) 0%, rgba(10, 4, 20, 0.95) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 22, stiffness: 240 }}
          className="relative w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #2a0d4a 0%, #1a0832 60%, #140626 100%)",
            boxShadow: "0 -20px 60px rgba(168, 85, 247, 0.35), 0 0 0 1px rgba(255,255,255,0.08) inset",
          }}
        >
          {/* Glow halo */}
          <div
            className="absolute inset-x-0 -top-16 h-40 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(236, 72, 153, 0.55) 0%, rgba(168, 85, 247, 0.25) 45%, transparent 75%)",
            }}
          />

          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/90 hover:bg-white/10 transition disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          <div className="relative px-7 pt-12 pb-7 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 14 }}
              className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
                boxShadow: "0 12px 30px rgba(236, 72, 153, 0.45)",
              }}
            >
              <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </motion.div>

            <p className="text-white/70 text-xs uppercase tracking-[0.3em] mb-3">
              from {personaName}
            </p>

            <h2 className="text-white text-[26px] sm:text-3xl font-semibold leading-tight mb-3">
              You Earned Your<br />First Reveal
            </h2>

            <p className="text-white/80 text-[15px] leading-relaxed mb-7 px-2">
              Start your free month now to see what she sent you tonight.
            </p>

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={submitting}
              className="w-full py-4 rounded-2xl text-white font-semibold text-[17px] transition active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #8b5cf6 100%)",
                boxShadow: "0 10px 30px rgba(168, 85, 247, 0.5), 0 0 0 1px rgba(255,255,255,0.12) inset",
              }}
            >
              {submitting ? "Unlocking…" : "Start Free Trial — $0 Today"}
            </button>

            <p className="text-white/55 text-xs mt-4 leading-relaxed">
              Then $9.99/month after trial. Cancel anytime.
            </p>

            {error && (
              <p className="text-pink-300 text-xs mt-3">{error}</p>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              disabled={submitting}
              className="text-white/50 hover:text-white/75 text-xs mt-5 underline-offset-4 hover:underline transition disabled:opacity-40"
            >
              Not right now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
