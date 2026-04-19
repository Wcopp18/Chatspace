"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export interface LevelRow {
  id: string;
  persona_id: string;
  level_number: number;
  name: string;
  description: string | null;
  xp_to_complete: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
}

export interface RewardRow {
  id: string;
  level_id: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
  preview_url?: string | null; // set when freshly uploaded
}

interface Props {
  personaId: string;
  personaName: string;
  initialLevels: LevelRow[];
  initialRewards: RewardRow[];
}

export default function LevelsEditor({ personaId, personaName, initialLevels, initialRewards }: Props) {
  const router = useRouter();
  const [levels, setLevels] = useState<LevelRow[]>(initialLevels);
  const [rewards, setRewards] = useState<RewardRow[]>(initialRewards);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(initialLevels[0]?.id || null);
  const [creatingLevel, setCreatingLevel] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function updateLevel(level: LevelRow, patch: Partial<LevelRow>) {
    setSaving(level.id);
    setLevels(prev => prev.map(l => l.id === level.id ? { ...l, ...patch } : l));
    try {
      await fetch(`/api/creator/levels/${level.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } finally {
      setSaving(null);
      router.refresh();
    }
  }

  async function deleteLevel(level: LevelRow) {
    if (!confirm(`Remove level "${level.name}"? This hides it from new users but keeps rewards already delivered.`)) return;
    setSaving(level.id);
    try {
      await fetch(`/api/creator/levels/${level.id}`, { method: "DELETE" });
      setLevels(prev => prev.filter(l => l.id !== level.id));
    } finally {
      setSaving(null);
    }
  }

  async function createLevel(form: { level_number: number; name: string; xp_to_complete: number; description: string; color: string; icon: string }) {
    setCreatingLevel(true);
    try {
      const res = await fetch("/api/creator/levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_id: personaId,
          level_number: form.level_number,
          name: form.name,
          description: form.description,
          xp_to_complete: form.xp_to_complete,
          color: form.color,
          icon: form.icon,
        }),
      });
      const data = await res.json();
      if (data.level) {
        setLevels(prev => [...prev, data.level].sort((a, b) => a.level_number - b.level_number));
        setExpandedLevel(data.level.id);
      } else {
        alert(data.error || "Failed to create level");
      }
    } finally {
      setCreatingLevel(false);
    }
  }

  async function uploadReward(level: LevelRow, file: File, mediaType: "image" | "video", caption: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("media_type", mediaType);
    fd.append("caption", caption);

    setSaving(level.id);
    try {
      const res = await fetch(`/api/creator/levels/${level.id}/rewards`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.reward) {
        setRewards(prev => [...prev, { ...data.reward, preview_url: data.preview_url }]);
      } else {
        alert(data.error || "Upload failed");
      }
    } finally {
      setSaving(null);
    }
  }

  async function deleteReward(reward: RewardRow) {
    if (!confirm("Remove this reward? Users who already received it still have it.")) return;
    setSaving(reward.id);
    try {
      await fetch(`/api/creator/rewards/${reward.id}`, { method: "DELETE" });
      setRewards(prev => prev.filter(r => r.id !== reward.id));
    } finally {
      setSaving(null);
    }
  }

  const nextLevelNumber = levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Relationship Levels</h1>
        <p className="text-white/50 text-sm mt-1">
          Define how {personaName}&apos;s bond with the user grows. Each level is a catchy phrase. When a
          user fills that level&apos;s bar, any free images or videos you upload here are delivered to them as a gift.
        </p>
      </div>

      <div className="space-y-3">
        {levels.map((level) => {
          const levelRewards = rewards.filter(r => r.level_id === level.id && r.is_active);
          const expanded = expandedLevel === level.id;
          return (
            <div key={level.id} className="bg-[#1E1E30] border border-white/8 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedLevel(expanded ? null : level.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: level.color || "#8B5CF6", color: "#fff" }}
                  >
                    {level.icon || level.level_number}
                  </span>
                  <div>
                    <div className="text-white font-semibold">{level.name}</div>
                    <div className="text-white/40 text-xs">
                      Lvl {level.level_number} · {level.xp_to_complete} XP · {levelRewards.length} reward{levelRewards.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <span className="text-white/40 text-sm">{expanded ? "−" : "+"}</span>
              </button>

              {expanded && (
                <div className="p-4 border-t border-white/8 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-white/60">
                      Level name
                      <input
                        type="text"
                        defaultValue={level.name}
                        onBlur={(e) => e.target.value !== level.name && updateLevel(level, { name: e.target.value })}
                        className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="text-xs text-white/60">
                      XP to complete
                      <input
                        type="number"
                        min={10}
                        defaultValue={level.xp_to_complete}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (v && v !== level.xp_to_complete) updateLevel(level, { xp_to_complete: v });
                        }}
                        className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="text-xs text-white/60">
                      Icon (emoji)
                      <input
                        type="text"
                        defaultValue={level.icon || ""}
                        maxLength={4}
                        onBlur={(e) => e.target.value !== (level.icon || "") && updateLevel(level, { icon: e.target.value || null })}
                        className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="text-xs text-white/60">
                      Color
                      <input
                        type="color"
                        defaultValue={level.color || "#8B5CF6"}
                        onBlur={(e) => e.target.value !== level.color && updateLevel(level, { color: e.target.value })}
                        className="mt-1 w-full h-10 bg-[#0D0D1A] border border-white/10 rounded-lg"
                      />
                    </label>
                  </div>

                  <label className="text-xs text-white/60 block">
                    Description (shown under the meter)
                    <textarea
                      defaultValue={level.description || ""}
                      onBlur={(e) => e.target.value !== (level.description || "") && updateLevel(level, { description: e.target.value || null })}
                      rows={2}
                      className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white/70 text-sm font-semibold">End-of-level rewards (free media)</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fileRefs.current[level.id]?.click()}
                          className="text-xs px-3 py-1.5 bg-[#FF3CAC]/20 text-[#FF3CAC] rounded-full font-semibold hover:bg-[#FF3CAC]/30 transition"
                        >
                          + Add image/video
                        </button>
                        <input
                          ref={(el) => { fileRefs.current[level.id] = el; }}
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const mediaType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
                            const caption = prompt("Optional caption?") || "";
                            uploadReward(level, file, mediaType, caption);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>

                    {levelRewards.length === 0 ? (
                      <p className="text-white/40 text-xs">No rewards yet. Users who hit this level will still level up — but no media will be delivered.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {levelRewards.map((r) => (
                          <div key={r.id} className="relative bg-[#0D0D1A] border border-white/8 rounded-lg overflow-hidden aspect-square">
                            {r.media_type === "video" ? (
                              <div className="flex items-center justify-center h-full text-3xl">🎬</div>
                            ) : r.preview_url ? (
                              <Image src={r.preview_url} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="flex items-center justify-center h-full text-3xl">🖼️</div>
                            )}
                            {r.caption && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-white/80 truncate">
                                {r.caption}
                              </div>
                            )}
                            <button
                              onClick={() => deleteReward(r)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white/80 text-xs hover:bg-red-500/80"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => deleteLevel(level)}
                      className="text-xs text-red-400/80 hover:text-red-400"
                    >
                      Remove level
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CreateLevelForm
        defaultLevelNumber={nextLevelNumber}
        submitting={creatingLevel}
        onCreate={createLevel}
      />

      {saving && <div className="fixed bottom-6 right-6 bg-[#1E1E30] text-white/70 text-xs px-3 py-2 rounded-lg">Saving…</div>}
    </div>
  );
}

function CreateLevelForm({ defaultLevelNumber, submitting, onCreate }: {
  defaultLevelNumber: number;
  submitting: boolean;
  onCreate: (f: { level_number: number; name: string; xp_to_complete: number; description: string; color: string; icon: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [levelNumber, setLevelNumber] = useState(defaultLevelNumber);
  const [xp, setXp] = useState(200);
  const [color, setColor] = useState("#8B5CF6");
  const [icon, setIcon] = useState("");

  useEffect(() => { setLevelNumber(defaultLevelNumber); }, [defaultLevelNumber]);

  return (
    <div className="bg-[#1E1E30] border border-dashed border-white/10 rounded-2xl p-4">
      <h3 className="text-white/80 text-sm font-semibold mb-3">Add a new level</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-white/60">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Soulmate"
            className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
        </label>
        <label className="text-xs text-white/60">
          Level #
          <input type="number" min={1} value={levelNumber} onChange={(e) => setLevelNumber(parseInt(e.target.value, 10) || 1)}
            className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
        </label>
        <label className="text-xs text-white/60">
          XP to complete
          <input type="number" min={10} value={xp} onChange={(e) => setXp(parseInt(e.target.value, 10) || 10)}
            className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
        </label>
        <label className="text-xs text-white/60">
          Icon (emoji)
          <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4}
            className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
        </label>
      </div>
      <label className="text-xs text-white/60 block mb-3">
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="mt-1 w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
      </label>
      <div className="flex items-center justify-between">
        <label className="text-xs text-white/60 flex items-center gap-2">
          Color <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded" />
        </label>
        <button
          disabled={!name || submitting}
          onClick={() => {
            onCreate({ level_number: levelNumber, name, xp_to_complete: xp, description, color, icon });
            setName(""); setDescription(""); setIcon("");
          }}
          className="px-4 py-2 rounded-lg bg-[#FF3CAC] text-white text-sm font-semibold disabled:opacity-40"
        >
          {submitting ? "Creating…" : "Create level"}
        </button>
      </div>
    </div>
  );
}
