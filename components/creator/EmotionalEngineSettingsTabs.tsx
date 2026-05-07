/**
 * Settings tabs for the per-girl emotional engine config:
 *   • Trigger Logic (signal weights + global timing rules)
 *   • Relationship Dynamics (positive/negative signals + reaction style)
 *   • Memory & Attachment
 *   • AI Style Controls (anti-repetition + humanization)
 *   • Leaving Logic (continue-chat pacing)
 *   • Analytics
 *
 * All write through /api/creator/emotional-engine/[personaId].
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmotionalPersonaSettings,
  EmotionalSignalWeight,
} from "@/types/emotional-engine";

interface EngineConfigData {
  settings: EmotionalPersonaSettings;
  weights: EmotionalSignalWeight[];
  globalWeights: EmotionalSignalWeight[];
}

export type EngineSettingsTab =
  | "trigger"
  | "relationship"
  | "memory"
  | "ai_style"
  | "leaving"
  | "analytics";

interface Props {
  personaId: string;
  personaName: string;
  tab: EngineSettingsTab;
}

export default function EmotionalEngineSettingsTabs({ personaId, personaName, tab }: Props) {
  const [data, setData] = useState<EngineConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, [personaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/emotional-engine/${personaId}`);
      if (res.ok) {
        const d = await res.json();
        setData({
          settings: d.settings,
          weights: d.weights || [],
          globalWeights: d.globalWeights || [],
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(patch: Partial<EmotionalPersonaSettings>) {
    if (!data) return;
    const next = { ...data.settings, ...patch };
    setData({ ...data, settings: next });
  }

  async function commit() {
    if (!data) return;
    setSaving(true);
    try {
      await fetch(`/api/creator/emotional-engine/${personaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: data.settings, weights: data.weights }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return <div className="text-center py-12 text-white/30">Loading…</div>;
  }

  return (
    <div className="space-y-5">
      {tab === "trigger" && <TriggerTab data={data} setData={setData} saveSettings={saveSettings} />}
      {tab === "relationship" && <RelationshipTab data={data} saveSettings={saveSettings} />}
      {tab === "memory" && <MemoryTab data={data} saveSettings={saveSettings} />}
      {tab === "ai_style" && <AIStyleTab data={data} saveSettings={saveSettings} />}
      {tab === "leaving" && <LeavingTab data={data} saveSettings={saveSettings} personaName={personaName} />}
      {tab === "analytics" && <AnalyticsTab personaId={personaId} />}

      {tab !== "analytics" && (
        <div className="sticky bottom-0 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-[#0D0D1A] to-transparent">
          <button onClick={commit} disabled={saving} className="w-full gradient-bg text-white font-semibold py-3 rounded-xl disabled:opacity-60">
            {saved ? "✓ Saved" : saving ? "Saving…" : `Save ${tabLabel(tab)}`}
          </button>
        </div>
      )}
    </div>
  );
}

function tabLabel(t: EngineSettingsTab): string {
  return ({
    trigger: "Trigger Logic",
    relationship: "Relationship Dynamics",
    memory: "Memory & Attachment",
    ai_style: "AI Style",
    leaving: "Leaving Logic",
    analytics: "Analytics",
  } as Record<EngineSettingsTab, string>)[t];
}

// ── Trigger Logic ──────────────────────────────────────────────────────────

function TriggerTab({
  data,
  setData,
  saveSettings,
}: {
  data: EngineConfigData;
  setData: (d: EngineConfigData) => void;
  saveSettings: (p: Partial<EmotionalPersonaSettings>) => void;
}) {
  // Merge: a row per global signal, override with per-persona row if present
  const rows = useMemo(() => {
    const personalByKey = new Map(data.weights.map((w) => [w.signal_key, w]));
    return data.globalWeights.map((g) => {
      const personal = personalByKey.get(g.signal_key);
      return {
        signal_key: g.signal_key,
        notes: g.notes,
        defaultWeight: g.weight,
        weight: personal?.weight ?? g.weight,
        enabled: personal?.enabled ?? g.enabled,
      };
    });
  }, [data.weights, data.globalWeights]);

  function updateWeight(signalKey: string, weight: number) {
    const next = [...data.weights];
    const idx = next.findIndex((w) => w.signal_key === signalKey);
    if (idx >= 0) next[idx] = { ...next[idx], weight };
    else next.push({
      id: "",
      persona_id: "",
      signal_key: signalKey,
      weight,
      enabled: true,
      notes: "",
      created_at: "",
      updated_at: "",
    });
    setData({ ...data, weights: next });
  }

  function toggleEnabled(signalKey: string, enabled: boolean) {
    const next = [...data.weights];
    const idx = next.findIndex((w) => w.signal_key === signalKey);
    if (idx >= 0) next[idx] = { ...next[idx], enabled };
    else next.push({
      id: "",
      persona_id: "",
      signal_key: signalKey,
      weight: rows.find((r) => r.signal_key === signalKey)?.defaultWeight ?? 0,
      enabled,
      notes: "",
      created_at: "",
      updated_at: "",
    });
    setData({ ...data, weights: next });
  }

  const positive = rows.filter((r) => r.defaultWeight >= 0);
  const negative = rows.filter((r) => r.defaultWeight < 0);

  const s = data.settings;

  return (
    <div className="space-y-5">
      <Section title="Global timing rules">
        <NumberField label="Min messages before media" value={s.min_messages_before_media} onChange={(v) => saveSettings({ min_messages_before_media: v })} />
        <NumberField label="Min messages before multi-media" value={s.min_messages_before_multi_media} onChange={(v) => saveSettings({ min_messages_before_multi_media: v })} />
        <NumberField label="Continue-chat cooldown (sec)" value={s.continue_chat_cooldown_seconds} onChange={(v) => saveSettings({ continue_chat_cooldown_seconds: v })} />
        <NumberField label="Subscription cooldown (sec)" value={s.subscription_cooldown_seconds} onChange={(v) => saveSettings({ subscription_cooldown_seconds: v })} />
        <NumberField label="Randomness skip (%)" value={s.randomness_percent} onChange={(v) => saveSettings({ randomness_percent: Math.max(0, Math.min(100, v)) })} />
        <SelectField label="Monetization pacing" value={s.monetization_pacing_speed} options={["slow", "medium", "fast"]} onChange={(v) => saveSettings({ monetization_pacing_speed: v as "slow" | "medium" | "fast" })} />
        <SelectField label="Emotional pacing" value={s.emotional_pacing_speed} options={["slow", "medium", "fast"]} onChange={(v) => saveSettings({ emotional_pacing_speed: v as "slow" | "medium" | "fast" })} />
      </Section>

      <Section title="Positive signal weights">
        <p className="text-white/40 text-xs">Higher weight = signal counts more toward eligibility.</p>
        {positive.map((r) => (
          <SignalRow
            key={r.signal_key}
            row={r}
            onWeight={(v) => updateWeight(r.signal_key, v)}
            onToggle={(v) => toggleEnabled(r.signal_key, v)}
          />
        ))}
      </Section>

      <Section title="Negative / pause signals">
        <p className="text-white/40 text-xs">
          Negatives slow or pause monetization timing. They do <em>not</em> make her stop liking the user.
        </p>
        {negative.map((r) => (
          <SignalRow
            key={r.signal_key}
            row={r}
            onWeight={(v) => updateWeight(r.signal_key, v)}
            onToggle={(v) => toggleEnabled(r.signal_key, v)}
          />
        ))}
      </Section>
    </div>
  );
}

function SignalRow({
  row,
  onWeight,
  onToggle,
}: {
  row: { signal_key: string; weight: number; enabled: boolean; notes: string; defaultWeight: number };
  onWeight: (v: number) => void;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className={`flex items-center gap-3 bg-[#252538] rounded-xl px-3 py-2 ${!row.enabled ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="text-white/85 text-sm font-medium">{prettify(row.signal_key)}</p>
        {row.notes && <p className="text-white/35 text-xs leading-snug">{row.notes}</p>}
      </div>
      <input
        type="number"
        value={row.weight}
        onChange={(e) => onWeight(parseInt(e.target.value || "0"))}
        className="creator-input w-16 py-1.5 text-center"
      />
      <button
        onClick={() => onToggle(!row.enabled)}
        className={`text-xs px-2 py-1 rounded-lg border ${
          row.enabled ? "border-green-400/30 text-green-300 bg-green-400/10" : "border-white/15 text-white/30"
        }`}
      >
        {row.enabled ? "on" : "off"}
      </button>
    </div>
  );
}

function prettify(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Relationship Dynamics ─────────────────────────────────────────────────

function RelationshipTab({
  data,
  saveSettings,
}: {
  data: EngineConfigData;
  saveSettings: (p: Partial<EmotionalPersonaSettings>) => void;
}) {
  const s = data.settings;
  const POS_OPTIONS = [
    "compliments", "reassurance", "flirting", "long_conversations", "daily_returns",
    "emotional_support", "asks_personal_questions", "remembers_details", "reacts_to_moments",
  ];
  const NEG_OPTIONS = [
    "insults", "ignored_vulnerability", "repeated_dry_responses", "ignoring_moments",
    "rude_comments", "dismissing_vulnerability", "talking_only_sexually",
  ];
  const REACTION_STYLES = ["shy_hurt", "teasing_hurt", "awkward_hurt", "reassurance_seeking", "slight_withdrawal", "playful_recovery"];

  return (
    <>
      <Section title="What builds connection">
        <p className="text-white/40 text-xs">Tap to toggle which positive signals matter for this girl.</p>
        <div className="flex flex-wrap gap-2">
          {POS_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              label={prettify(opt)}
              on={s.positive_signals.includes(opt)}
              onClick={() =>
                saveSettings({
                  positive_signals: s.positive_signals.includes(opt)
                    ? s.positive_signals.filter((x) => x !== opt)
                    : [...s.positive_signals, opt],
                })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="What hurts emotional momentum (not affection)">
        <p className="text-white/40 text-xs">These slow trust/openness; they don&apos;t make her dislike the user.</p>
        <div className="flex flex-wrap gap-2">
          {NEG_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              label={prettify(opt)}
              on={s.negative_signals.includes(opt)}
              onClick={() =>
                saveSettings({
                  negative_signals: s.negative_signals.includes(opt)
                    ? s.negative_signals.filter((x) => x !== opt)
                    : [...s.negative_signals, opt],
                })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Reaction style">
        <SelectField
          label="When something stings"
          value={s.reaction_style}
          options={REACTION_STYLES}
          onChange={(v) => saveSettings({ reaction_style: v })}
        />
        <Slider label="Recovery speed" value={s.recovery_speed} max={10} onChange={(v) => saveSettings({ recovery_speed: v })} left="Lingers" right="Bounces back" />
      </Section>
    </>
  );
}

// ── Memory & Attachment ───────────────────────────────────────────────────

function MemoryTab({ data, saveSettings }: { data: EngineConfigData; saveSettings: (p: Partial<EmotionalPersonaSettings>) => void }) {
  const s = data.settings;
  const REMEMBERED = [
    "compliments", "vulnerability", "jokes", "insecurities", "favorite_topics",
    "late_night", "reassurance", "unlocks", "ignored_moments", "promises", "anniversaries",
  ];
  return (
    <>
      <Section title="What she remembers">
        <div className="flex flex-wrap gap-2">
          {REMEMBERED.map((opt) => (
            <Chip
              key={opt}
              label={prettify(opt)}
              on={s.remembered_categories.includes(opt)}
              onClick={() =>
                saveSettings({
                  remembered_categories: s.remembered_categories.includes(opt)
                    ? s.remembered_categories.filter((x) => x !== opt)
                    : [...s.remembered_categories, opt],
                })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Memory dynamics">
        <Slider label="Memory strength" value={s.memory_strength} max={10} onChange={(v) => saveSettings({ memory_strength: v })} left="Forgetful" right="Persistent" />
        <Slider label="Attachment speed" value={s.attachment_speed} max={10} onChange={(v) => saveSettings({ attachment_speed: v })} left="Slow burn" right="Quickly attached" />
        <Slider label="Callback frequency" value={s.callback_frequency} max={10} onChange={(v) => saveSettings({ callback_frequency: v })} left="Rare" right="Often" />
      </Section>
    </>
  );
}

// ── AI Style ──────────────────────────────────────────────────────────────

function AIStyleTab({ data, saveSettings }: { data: EngineConfigData; saveSettings: (p: Partial<EmotionalPersonaSettings>) => void }) {
  const s = data.settings;
  return (
    <>
      <Section title="Anti-repetition">
        <NumberField label="Phrase cooldown (sec)" value={s.phrase_cooldown_seconds} onChange={(v) => saveSettings({ phrase_cooldown_seconds: v })} />
        <NumberField label="Max phrase reuse" value={s.max_phrase_reuse} onChange={(v) => saveSettings({ max_phrase_reuse: v })} />
        <Slider label="Similarity threshold" value={Math.round(s.similarity_threshold * 100)} max={100} onChange={(v) => saveSettings({ similarity_threshold: v / 100 })} left="Strict" right="Loose" />
      </Section>

      <Section title="Humanization">
        <Slider label="Awkwardness" value={s.awkwardness} max={10} onChange={(v) => saveSettings({ awkwardness: v })} />
        <Slider label="Impulsiveness" value={s.impulsiveness} max={10} onChange={(v) => saveSettings({ impulsiveness: v })} />
        <Slider label="Overthinking" value={s.overthinking} max={10} onChange={(v) => saveSettings({ overthinking: v })} />
        <Slider label="Hesitation" value={s.hesitation} max={10} onChange={(v) => saveSettings({ hesitation: v })} />
      </Section>

      <Section title="Text texture">
        <Slider label="Lowercase %" value={s.lowercase_percent} max={100} onChange={(v) => saveSettings({ lowercase_percent: v })} />
        <Slider label="Punctuation chaos" value={s.punctuation_chaos} max={10} onChange={(v) => saveSettings({ punctuation_chaos: v })} />
        <Slider label="Emoji randomness" value={s.emoji_randomness} max={10} onChange={(v) => saveSettings({ emoji_randomness: v })} />
        <Slider label="Typo frequency" value={s.typo_frequency} max={10} onChange={(v) => saveSettings({ typo_frequency: v })} />
      </Section>
    </>
  );
}

// ── Leaving Logic ─────────────────────────────────────────────────────────

function LeavingTab({ data, saveSettings, personaName }: { data: EngineConfigData; saveSettings: (p: Partial<EmotionalPersonaSettings>) => void; personaName: string }) {
  const s = data.settings;
  const STYLES = ["soft_exit", "playful", "wants_to_stay", "busy", "emotional", "clingy", "sleepy", "nervous", "distracted"];
  return (
    <>
      <Section title={`How ${personaName} leaves`}>
        <p className="text-white/40 text-xs">
          Avoid fake real-world emergencies. The girl naturally pauses; the UI shows a transparent &quot;Continue chatting — $1.99&quot; price card.
        </p>
        <SelectField label="Leaving style" value={s.leaving_style} options={STYLES} onChange={(v) => saveSettings({ leaving_style: v })} />
        <Slider label="Reluctance to leave" value={s.leaving_reluctance} max={10} onChange={(v) => saveSettings({ leaving_reluctance: v })} left="Wants out" right="Wants to stay" />
      </Section>

      <Section title="Trigger conditions">
        <NumberField label="Min session messages" value={s.leaving_min_session_messages} onChange={(v) => saveSettings({ leaving_min_session_messages: v })} />
        <NumberField label="Min session seconds" value={s.leaving_min_session_duration_seconds} onChange={(v) => saveSettings({ leaving_min_session_duration_seconds: v })} />
        <NumberField label="Max prompts per day" value={s.leaving_max_prompts_per_day} onChange={(v) => saveSettings({ leaving_max_prompts_per_day: v })} />
      </Section>
    </>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────

interface AnalyticsResponse {
  sinceIso: string;
  totalFires: number;
  totalBlocks: number;
  byCategory: { key: string; fires: number; monetizationFires: number }[];
  blockReasons: { reason: string; count: number }[];
}

function AnalyticsTab({ personaId }: { personaId: string }) {
  const [stats, setStats] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [personaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/emotional-analytics/${personaId}`);
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-white/30">Loading analytics…</div>;
  if (!stats) return <div className="text-center py-12 text-white/40">No data yet</div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Category fires (30d)" value={stats.totalFires} />
        <Stat label="Blocked (30d)" value={stats.totalBlocks} />
      </div>

      <Section title="Top categories">
        {stats.byCategory.length === 0 ? (
          <p className="text-white/30 text-sm italic">No categories fired yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.byCategory
              .sort((a, b) => b.fires - a.fires)
              .map((c) => (
                <div key={c.key} className="flex items-center justify-between bg-[#252538] rounded-xl px-3 py-2">
                  <p className="text-white/80 text-sm font-mono">{c.key}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/50">{c.fires} fires</span>
                    {c.monetizationFires > 0 && (
                      <span className="text-[#FF3CAC]">{c.monetizationFires} w/ media</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Section>

      <Section title="Block reasons">
        {stats.blockReasons.length === 0 ? (
          <p className="text-white/30 text-sm italic">No blocks recorded.</p>
        ) : (
          <div className="space-y-2">
            {stats.blockReasons
              .sort((a, b) => b.count - a.count)
              .map((b) => (
                <div key={b.reason} className="flex items-center justify-between bg-[#252538] rounded-xl px-3 py-2">
                  <p className="text-white/70 text-sm">{b.reason}</p>
                  <span className="text-white/50 text-xs">{b.count}</span>
                </div>
              ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
      <p className="text-white font-semibold text-sm">{title}</p>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-white/60 text-sm">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value || "0"))} className="creator-input w-28 text-right" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/60 text-sm font-medium">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="creator-input">
        {options.map((o) => (
          <option key={o} value={o}>{prettify(o)}</option>
        ))}
      </select>
    </div>
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

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        on
          ? "border-[#FF3CAC] bg-[#FF3CAC]/15 text-white"
          : "border-white/10 bg-transparent text-white/40 hover:text-white/70 hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
      <p className="text-white/40 text-xs">{label}</p>
      <p className="text-white font-bold text-2xl mt-1">{value}</p>
    </div>
  );
}
