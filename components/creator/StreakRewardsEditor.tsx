"use client";

import { useEffect, useState } from "react";

interface Moment {
  id: string;
  title: string;
  thumbnail_url: string | null;
  media_type: string;
}

interface Reward {
  id?: string;
  persona_id?: string;
  day_milestone: number;
  moment_id: string | null;
  intro_line: string;
  intro_mode: "exact" | "paraphrase" | "ai_generate";
  is_active: boolean;
}

const DEFAULT_MILESTONES = [3, 7, 14, 30, 60];
const DEFAULT_LINES: Record<number, string> = {
  3: "I've been wanting to send you this 💜",
  7: "okay I'm only sending this because it's been you for a while now",
  14: "you've earned this somehow idk 😭",
  30: "this is just for you. been thinking a lot.",
  60: "thinking of you 💜",
};

export default function StreakRewardsEditor({ personaId }: { personaId: string }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, [personaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/streak-rewards/${personaId}`);
      if (res.ok) {
        const d = await res.json();
        setMoments(d.moments || []);
        // Hydrate full milestone list, falling back to defaults
        const byDay = new Map<number, Reward>();
        for (const r of d.rewards || []) byDay.set(r.day_milestone, r);
        const merged: Reward[] = DEFAULT_MILESTONES.map((day) => {
          return (
            byDay.get(day) || {
              day_milestone: day,
              moment_id: null,
              intro_line: DEFAULT_LINES[day] || "",
              intro_mode: "paraphrase",
              is_active: false,
            }
          );
        });
        setRewards(merged);
      }
    } finally {
      setLoading(false);
    }
  }

  function update(day: number, patch: Partial<Reward>) {
    setRewards((rs) => rs.map((r) => (r.day_milestone === day ? { ...r, ...patch } : r)));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/creator/streak-rewards/${personaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewards }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-8 text-white/30">Loading streak rewards…</div>;

  return (
    <div className="space-y-4">
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-1">Streak Rewards (free moments)</p>
        <p className="text-white/40 text-xs">
          When the user hits a daily-streak milestone with this girl, the next chat
          turn delivers this moment FREE with the chosen intro line. She never says
          "streak reward" — paraphrase mode keeps it human.
        </p>
      </div>

      {rewards.map((r) => (
        <div key={r.day_milestone} className={`bg-[#1E1E30] border rounded-2xl p-4 space-y-3 ${r.is_active ? "border-white/10" : "border-white/5"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Day {r.day_milestone}</p>
              <p className="text-white/40 text-xs">Free moment delivered when user hits a {r.day_milestone}-day streak</p>
            </div>
            <label className="flex items-center gap-2 text-white/70 text-xs">
              <input type="checkbox" checked={r.is_active} onChange={(e) => update(r.day_milestone, { is_active: e.target.checked })} />
              Active
            </label>
          </div>

          <Field label="Pick a moment">
            <select
              value={r.moment_id || ""}
              onChange={(e) => update(r.day_milestone, { moment_id: e.target.value || null })}
              className="creator-input"
            >
              <option value="">— select moment —</option>
              {moments.map((m) => (
                <option key={m.id} value={m.id}>{m.title} ({m.media_type})</option>
              ))}
            </select>
          </Field>

          <Field label="Intro line (paraphrase reference)">
            <textarea
              value={r.intro_line}
              onChange={(e) => update(r.day_milestone, { intro_line: e.target.value })}
              rows={2}
              className="creator-input resize-none"
            />
          </Field>

          <Field label="Mode">
            <select
              value={r.intro_mode}
              onChange={(e) => update(r.day_milestone, { intro_mode: e.target.value as Reward["intro_mode"] })}
              className="creator-input"
            >
              <option value="paraphrase">Paraphrase</option>
              <option value="exact">Exact</option>
              <option value="ai_generate">AI Generate</option>
            </select>
          </Field>
        </div>
      ))}

      <button onClick={save} disabled={saving} className="w-full gradient-bg text-white font-semibold py-3 rounded-xl disabled:opacity-60">
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save Streak Rewards"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/60 text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
