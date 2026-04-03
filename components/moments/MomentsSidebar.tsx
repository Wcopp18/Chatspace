"use client";

import { useEffect } from "react";
import Image from "next/image";
import MomentCard from "./MomentCard";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface Props {
  open: boolean;
  onClose: () => void;
  moments: Moment[];
  onUnlock: (id: string) => void;
  persona: Persona;
}

export default function MomentsSidebar({ open, onClose, moments, onUnlock, persona }: Props) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-[#13131F] border-l border-white/8 z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 safe-top">
          <div>
            <h2 className="text-white font-semibold text-base">Saved Moments</h2>
            <p className="text-white/40 text-xs mt-0.5">{moments.length} moment{moments.length !== 1 ? "s" : ""} waiting</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {moments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="text-3xl mb-3">📭</div>
              <p className="text-white/40 text-sm">No saved moments yet.</p>
              <p className="text-white/25 text-xs mt-1">Dismiss moments from chat to save them here.</p>
            </div>
          ) : (
            moments.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                persona={persona}
                onDismiss={() => {}} // Already in sidebar, no dismiss action
                onUnlock={() => onUnlock(moment.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
