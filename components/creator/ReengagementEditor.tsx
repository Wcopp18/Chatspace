"use client";

import { useEffect, useState } from "react";

interface Settings {
  persona_id: string;
  enabled: boolean;
  vulnerability_level: number;
  min_silence_hours: number;
  max_per_48h: number;
  max_per_week: number;
  fallback_line: string;
  require_memory: boolean;
  tone: string;
}

const TONES = ["soft_vulnerable", "playful", "hurt", "curious"];

export default function ReengagementEditor({
  personaId,
  personaName,
}: {
  personaId: string;
  personaName: string;
}) {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [personaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/reengagement/${personaId}`);
      if (res.ok) {
        const d = await res.json();
        setS(d.settings);
      }
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await fetch(`/api/creator/reengagement/${personaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !s) return <div className="text-center py-8 text-white/30">Loading…</div>;

  function update<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS({ ...s!, [k]: v });
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-1">Re-engagement Push</p>
        <p className="text-white/40 text-xs">
          When a user goes silent for {s.min_silence_hours}+ hours, {personaName} reaches out
          with a memory-grounded line. Caps prevent spam. She never says "come back" or
          mentions the app — she texts like a real person who's thinking about him.
        </p>
      </div>

      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
        <label className="flex items-center justify-between gap-2">
          <span className="text-white font-medium text-sm">Enabled</span>
          <Toggle on={s.enabled} onChange={() => update("enabled", !s.enabled)} />
        </label>

        <Field label={`Min silence before reaching out (hours)`}>
          <input type="number" value={s.min_silence_hours} onChange={(e) => update("min_silence_hours", parseInt(e.target.value || "0"))} className="creator-input" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Max per 48 hours">
            <input type="number" value={s.max_per_48h} onChange={(e) => update("max_per_48h", parseInt(e.target.value || "1"))} className="creator-input" />
          </Field>
          <Field label="Max per week">
            <input type="number" value={s.max_per_week} onChange={(e) => update("max_per_week", parseInt(e.target.value || "3"))} className="creator-input" />
          </Field>
        </div>

        <Slider label="Vulnerability level" value={s.vulnerability_level} max={10} onChange={(v) => update("vulnerability_level", v)} left="Cool & casual" right="Soft & vulnerable" />

        <Field label="Tone">
          <select value={s.tone} onChange={(e) => update("tone", e.target.value)} className="creator-input">
            {TONES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </Field>

        <label className="flex items-center justify-between gap-2">
          <div>
            <p className="text-white font-medium text-sm">Require a memory</p>
            <p className="text-white/40 text-xs">Only reach out if there's a specific memory to reference (recommended)</p>
          </div>
          <Toggle on={s.require_memory} onChange={() => update("require_memory", !s.require_memory)} />
        </label>

        <Field label="Fallback line (used only when no memory exists and require_memory is off)">
          <textarea value={s.fallback_line} onChange={(e) => update("fallback_line", e.target.value)} rows={2} className="creator-input resize-none" />
        </Field>
      </div>

      <button onClick={save} disabled={saving} className="w-full gradient-bg text-white font-semibold py-3 rounded-xl disabled:opacity-60">
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save Re-engagement Settings"}
      </button>

      {previewing && previewText && (
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-white/80 text-sm">
          <p className="text-white/40 text-xs mb-1">Preview</p>
          <p>"{previewText}"</p>
        </div>
      )}
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

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative ${on ? "bg-[#FF3CAC]" : "bg-white/15"}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${on ? "translate-x-7" : "translate-x-1"}`} />
    </button>
  );
}

function Slider({ label, value, max, onChange, left, right }: { label: string; value: number; max: number; onChange: (v: number) => void; left?: string; right?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-white/60 text-sm font-medium">{label}</label>
        <span className="text-[#FF3CAC] font-bold text-sm">{value}/{max}</span>
      </div>
      <input type="range" min={0} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full accent-[#FF3CAC] cursor-pointer" />
      {(left || right) && (
        <div className="flex justify-between text-[11px] text-white/25">
          <span>{left}</span><span>{right}</span>
        </div>
      )}
    </div>
  );
}
