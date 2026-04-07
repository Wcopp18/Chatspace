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
  const [location, setLocation] = useState("");
  const [styleReferences, setStyleReferences] = useState("");
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

  const inputClasses =
    "w-full bg-white/5 border border-cyan-500/30 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/25 resize-none focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition-colors";

  if (submitted) {
    return (
      <div className="bg-[#1E1E30] rounded-2xl p-5 max-w-[320px] shadow-lg">
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">✨</span>
          </div>
          <p className="text-white text-base font-bold mt-1">Request sent!</p>
          <p className="text-white/40 text-sm mt-1.5">
            {persona.display_name} will get back to you soon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1E30] rounded-2xl p-4 max-w-[320px] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
            <span className="text-base">✨</span>
          </div>
          <p className="text-white text-sm font-bold">Custom Video or Image Request</p>
        </div>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="space-y-3">
        {/* Describe your video */}
        <div>
          <label className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-1.5">
            <span>🎬</span> Describe your video
          </label>
          <textarea
            value={sceneIdea}
            onChange={(e) => setSceneIdea(e.target.value)}
            placeholder="Describe the scene or idea you have in mind..."
            className={inputClasses}
            rows={3}
          />
        </div>

        {/* Mood */}
        <div>
          <label className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-1.5">
            <span>♡</span> Mood
          </label>
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Playful, sultry, romantic, energetic..."
            className={inputClasses}
          />
        </div>

        {/* Outfit */}
        <div>
          <label className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-1.5">
            <span>✨</span> Outfit
          </label>
          <input
            type="text"
            value={outfit}
            onChange={(e) => setOutfit(e.target.value)}
            placeholder="Describe the outfit you'd like to see..."
            className={inputClasses}
          />
        </div>

        {/* Location vibe */}
        <div>
          <label className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-1.5">
            <span>📍</span> Location vibe
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Bedroom, outdoors, elegant setting, cozy..."
            className={inputClasses}
          />
        </div>

        {/* Style references */}
        <div>
          <label className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-1.5">
            <span>✨</span> Style references
          </label>
          <input
            type="text"
            value={styleReferences}
            onChange={(e) => setStyleReferences(e.target.value)}
            placeholder="Any specific styles or references..."
            className={inputClasses}
          />
        </div>

        {/* Special notes */}
        <div>
          <label className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-1.5">
            <span>📝</span> Special notes
          </label>
          <textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Any other details that would make this perfect..."
            className={inputClasses}
            rows={2}
          />
        </div>
      </div>

      {/* Submit button — purple gradient */}
      <button
        onClick={handleSubmit}
        disabled={!sceneIdea.trim() || submitting}
        className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-purple-600/30"
      >
        {submitting ? "Sending..." : "Send Request"}
      </button>
    </div>
  );
}
