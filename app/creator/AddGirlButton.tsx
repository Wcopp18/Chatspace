"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddGirlButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Name is required"); return; }
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/creator/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create");
        setCreating(false);
        return;
      }

      const data = await res.json();
      setShowModal(false);
      setName("");
      router.push(`/creator/${data.persona.slug}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
      setCreating(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="gradient-bg text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
      >
        + Add Girl
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#1E1E30] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-1">Add New Girl</h2>
            <p className="text-white/40 text-sm mb-4">Give her a name to get started. You can customize everything else after.</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-red-400 text-sm mb-3">
                {error}
              </div>
            )}

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mia, Sophie, Jade..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#FF3CAC]/50 focus:ring-1 focus:ring-[#FF3CAC]/30 transition-all text-sm mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setName(""); setError(""); }}
                className="flex-1 py-2.5 rounded-xl text-white/50 text-sm font-medium border border-white/10 hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="flex-1 gradient-bg text-white font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
