"use client";

import { motion } from "framer-motion";

interface Props {
  personaName: string;
  onDismiss: () => void;
}

export default function TensionExplainer({ personaName, onDismiss }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1A1A2E] rounded-2xl border border-white/10 p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <span className="text-3xl">🔥</span>
          <h2 className="text-white text-lg font-bold mt-2">Tension Meter</h2>
          <p className="text-white/50 text-sm mt-1">
            {personaName} notices how you talk to her
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">⬆️</span>
            <div>
              <p className="text-white text-sm font-medium">Strong messages raise it</p>
              <p className="text-white/40 text-xs">Flirting, compliments, emotional depth</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">⬇️</span>
            <div>
              <p className="text-white text-sm font-medium">Weak messages lower it</p>
              <p className="text-white/40 text-xs">Short replies, going off-topic, being repetitive</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <p className="text-white/60 text-xs font-medium mb-2">Reward zones:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
                <span className="text-white/50 text-xs">📸 40+ — Photo zone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400" />
                <span className="text-white/50 text-xs">✨ 70+ — Premium photo zone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-400" />
                <span className="text-white/50 text-xs">🎬 90+ — Video zone</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <span className="text-lg mt-0.5">🔄</span>
            <div>
              <p className="text-white text-sm font-medium">Rewards cool it down</p>
              <p className="text-white/40 text-xs">After unlocking content, the meter resets — build it back up for more</p>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full gradient-bg text-white text-sm font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
        >
          Got it, let&apos;s go
        </button>
      </motion.div>
    </motion.div>
  );
}
