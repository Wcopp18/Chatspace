"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export interface SurpriseGesturePayload {
  id: string;
  gesture_type: string;
  content_text: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
}

interface Props {
  gesture: SurpriseGesturePayload | null;
  personaName: string;
  onDismiss: () => void;
}

export default function SurpriseGestureToast({ gesture, personaName, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {gesture && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm"
          onClick={onDismiss}
        >
          <div
            className="rounded-2xl border border-[#FFD700]/40 p-4 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(255,60,172,0.2))",
              boxShadow: "0 8px 32px rgba(139,92,246,0.35), 0 0 20px rgba(255,215,0,0.15)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest text-yellow-400 font-bold">
                A little something from {personaName}
              </span>
            </div>
            {gesture.media_url && gesture.gesture_type === "free_image" && (
              <div className="rounded-xl overflow-hidden mb-2 border border-white/10">
                <Image src={gesture.media_url} alt="" width={400} height={300}
                  className="w-full aspect-[4/3] object-cover" unoptimized />
              </div>
            )}
            {gesture.media_url && gesture.gesture_type === "free_video" && (
              <div className="rounded-xl overflow-hidden mb-2 border border-white/10">
                <video src={gesture.media_url} controls playsInline
                  className="w-full aspect-[4/3] bg-black object-cover" />
              </div>
            )}
            {gesture.content_text && (
              <p className="text-white text-sm italic">&ldquo;{gesture.content_text}&rdquo;</p>
            )}
            {gesture.caption && (
              <p className="text-white/60 text-xs mt-2">{gesture.caption}</p>
            )}
            <p className="text-white/40 text-[10px] mt-3 text-center">tap to dismiss</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
