"use client";

import { useState } from "react";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

interface Props {
  persona: Persona;
  conversationId: string | null;
  onSubmitted: () => void;
  onDismiss: () => void;
}

export default function CustomRequestCard({ persona, conversationId, onSubmitted, onDismiss }: Props) {
  const [sceneIdea, setSceneIdea] = useState("");
  const [outfit, setOutfit] = useState("");
  const [mood, setMood] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!sceneIdea.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          conversationId,
          sceneIdea: sceneIdea.trim(),
          outfit: outfit.trim() || null,
          mood: mood.trim() || null,
          customNotes: customNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(onSubmitted, 2000);
      }
    } catch (err) {
      console.error("Custom request error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 max-w-[300px]">
        <div className="text-center py-3">
          <span className="text-2xl">✨</span>
          <p className="text-white text-sm font-semibold mt-2">Request sent!</p>
          <p className="text-white/40 text-xs mt-1">
            {persona.display_name} will get back to you soon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 max-w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <p className="text-white text-sm font-semibold">Custom Request</p>
        </div>
        <button
          onClick={onDismiss}
          className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="text-white/50 text-xs mb-3">
        Describe what you&apos;d like {persona.display_name} to make for you
      </p>

      {/* Form */}
      <div className="space-y-2">
        <textarea
          value={sceneIdea}
          onChange={(e) => setSceneIdea(e.target.value)}
          placeholder="Describe the scene or idea..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
          rows={3}
        />

        <input
          type="text"
          value={outfit}
          onChange={(e) => setOutfit(e.target.value)}
          placeholder="Outfit (optional)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20"
        />

        <input
          type="text"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="Mood / vibe (optional)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20"
        />

        <textarea
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Any other details... (optional)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
          rows={2}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!sceneIdea.trim() || submitting}
        className="w-full mt-3 gradient-bg text-white text-sm font-semibold py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Send Request"}
      </button>
    </div>
  );
}
