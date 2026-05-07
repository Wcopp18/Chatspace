"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmotionalCategory,
  EmotionalCategoryExample,
  EmotionalCategoryOverride,
  ParaphraseMode,
} from "@/types/emotional-engine";

interface Props {
  personaId: string;
  personaName: string;
}

interface CategoryListItem extends EmotionalCategory {
  exampleCount: number;
  overrideEnabled: boolean | null;
}

export default function EmotionalEngineEditor({ personaId, personaName }: Props) {
  const [categories, setCategories] = useState<EmotionalCategory[]>([]);
  const [examples, setExamples] = useState<EmotionalCategoryExample[]>([]);
  const [overrides, setOverrides] = useState<EmotionalCategoryOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    void loadAll();
  }, [personaId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [catRes, perRes] = await Promise.all([
        fetch("/api/creator/emotional-categories"),
        fetch(`/api/creator/emotional-engine/${personaId}`),
      ]);
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
        setExamples(d.examples || []);
      }
      if (perRes.ok) {
        const d = await perRes.json();
        setOverrides(d.overrides || []);
      }
    } finally {
      setLoading(false);
    }
  }

  const items: CategoryListItem[] = useMemo(() => {
    const exByCat = new Map<string, number>();
    for (const e of examples) {
      exByCat.set(e.category_id, (exByCat.get(e.category_id) || 0) + 1);
    }
    const ovByCat = new Map<string, EmotionalCategoryOverride>();
    for (const o of overrides) ovByCat.set(o.category_id, o);

    const filtered = categories.filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.display_name.toLowerCase().includes(q) ||
        c.internal_key.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });

    return filtered.map((c) => ({
      ...c,
      exampleCount: exByCat.get(c.id) || 0,
      overrideEnabled: ovByCat.get(c.id)?.enabled_override ?? null,
    }));
  }, [categories, examples, overrides, search]);

  async function toggleEnabled(cat: EmotionalCategory) {
    const next = !cat.enabled;
    setCategories((cs) => cs.map((c) => (c.id === cat.id ? { ...c, enabled: next } : c)));
    await fetch(`/api/creator/emotional-categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
  }

  async function togglePersonaOverride(cat: EmotionalCategory) {
    const cur = overrides.find((o) => o.category_id === cat.id);
    const newEnabled = cur?.enabled_override === false ? null : false;
    await fetch(`/api/creator/emotional-engine/${personaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overrides: [
          {
            category_id: cat.id,
            enabled_override: newEnabled,
            override_patch: cur?.override_patch || {},
            trigger_overrides: cur?.trigger_overrides || {},
            style_overrides: cur?.style_overrides || {},
            custom_examples: cur?.custom_examples || [],
          },
        ],
      }),
    });
    void loadAll();
  }

  async function duplicateCategory(cat: EmotionalCategory) {
    const newKey = prompt("Internal key for the new category (UPPER_SNAKE)", cat.internal_key + "_COPY");
    if (!newKey) return;
    const res = await fetch("/api/creator/emotional-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        internal_key: newKey,
        display_name: cat.display_name + " (copy)",
        description: cat.description,
        duplicate_from: cat.id,
      }),
    });
    if (res.ok) await loadAll();
  }

  async function deleteCategory(cat: EmotionalCategory) {
    if (!confirm(`Delete category "${cat.display_name}"? This removes all example lines and overrides for it.`)) return;
    await fetch(`/api/creator/emotional-categories/${cat.id}`, { method: "DELETE" });
    await loadAll();
  }

  if (loading) {
    return <div className="text-center py-12 text-white/30">Loading emotional engine…</div>;
  }

  if (editingId) {
    const cat = categories.find((c) => c.id === editingId);
    if (!cat) return null;
    const catExamples = examples.filter((e) => e.category_id === editingId);
    return (
      <CategoryEditor
        category={cat}
        examples={catExamples}
        personaId={personaId}
        override={overrides.find((o) => o.category_id === cat.id)}
        onClose={() => { setEditingId(null); void loadAll(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
        <p className="text-white/70 text-sm">
          Emotional categories tell {personaName} <em>which emotional direction</em> to lean into on a turn.
          Example lines are <strong>style references</strong>, not scripts — by default she paraphrases them in her own voice.
        </p>
        <p className="text-white/40 text-xs mt-2">
          Toggle <span className="text-white/70">Enabled</span> to control globally, or <span className="text-white/70">For this girl</span> to disable per-persona.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="creator-input flex-1"
        />
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="gradient-bg text-white text-sm font-semibold px-4 py-2 rounded-xl whitespace-nowrap"
        >
          {showNewForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showNewForm && (
        <NewCategoryForm
          onCreated={() => { setShowNewForm(false); void loadAll(); }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      <div className="grid gap-3">
        {items.map((c) => (
          <CategoryCard
            key={c.id}
            cat={c}
            onEdit={() => setEditingId(c.id)}
            onToggle={() => toggleEnabled(c)}
            onTogglePersona={() => togglePersonaOverride(c)}
            onDuplicate={() => duplicateCategory(c)}
            onDelete={() => deleteCategory(c)}
          />
        ))}
        {items.length === 0 && (
          <div className="text-center py-10 bg-[#1E1E30] rounded-2xl border border-white/5 text-white/40 text-sm">
            No categories match your search.
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryCard({
  cat,
  onEdit,
  onToggle,
  onTogglePersona,
  onDuplicate,
  onDelete,
}: {
  cat: CategoryListItem;
  onEdit: () => void;
  onToggle: () => void;
  onTogglePersona: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const personaDisabled = cat.overrideEnabled === false;
  return (
    <div className={`bg-[#1E1E30] border rounded-2xl p-4 transition-colors ${
      cat.enabled && !personaDisabled
        ? "border-white/10"
        : "border-white/5 opacity-60"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{cat.display_name}</p>
            <span className="text-[10px] text-white/35 font-mono">{cat.internal_key}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              cat.paraphrase_mode === "exact" ? "bg-yellow-400/15 text-yellow-300"
              : cat.paraphrase_mode === "ai_generate" ? "bg-blue-400/15 text-blue-300"
              : "bg-purple-400/15 text-purple-300"
            }`}>{cat.paraphrase_mode}</span>
            <span className="text-[10px] text-white/40">w:{cat.probability_weight}</span>
            <span className="text-[10px] text-white/40">{cat.exampleCount} examples</span>
          </div>
          <p className="text-white/55 text-xs mt-1.5 leading-snug line-clamp-2">{cat.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Toggle on={cat.enabled} onChange={onToggle} label="Global" />
          <Toggle on={!personaDisabled} onChange={onTogglePersona} label="For this girl" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={onEdit} className="text-xs gradient-bg text-white px-3 py-1.5 rounded-lg font-medium">
          Edit
        </button>
        <button onClick={onDuplicate} className="text-xs text-white/50 hover:text-white/80 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
          Duplicate
        </button>
        <button onClick={onDelete} className="text-xs text-red-400/60 hover:text-red-400 px-3 py-1.5 rounded-lg border border-red-500/15 hover:border-red-500/30 transition-colors ml-auto">
          Delete
        </button>
      </div>
    </div>
  );
}

function NewCategoryForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!key.trim() || !name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/creator/emotional-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_key: key, display_name: name, description: desc }),
      });
      if (res.ok) onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[#1E1E30] border border-[#FF3CAC]/20 rounded-2xl p-4 space-y-3">
      <p className="text-white font-semibold text-sm">New emotional category</p>
      <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="INTERNAL_KEY (e.g. SHY_RECOVERY)" className="creator-input font-mono" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name (e.g. Shy Recovery)" className="creator-input" />
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this category? When does it fire?" rows={2} className="creator-input resize-none" />
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy || !key.trim() || !name.trim()} className="gradient-bg text-white text-sm font-semibold px-4 py-2 rounded-xl flex-1 disabled:opacity-50">
          {busy ? "Creating…" : "Create"}
        </button>
        <button onClick={onCancel} className="text-white/40 hover:text-white/70 text-sm px-4 py-2 rounded-xl">Cancel</button>
      </div>
    </div>
  );
}

// ── Per-category editor ─────────────────────────────────────────────────────

function CategoryEditor({
  category,
  examples,
  personaId,
  override,
  onClose,
}: {
  category: EmotionalCategory;
  examples: EmotionalCategoryExample[];
  personaId: string;
  override?: EmotionalCategoryOverride;
  onClose: () => void;
}) {
  const [edited, setEdited] = useState<EmotionalCategory>(category);
  const [exList, setExList] = useState(examples);
  const [newLine, setNewLine] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customExamples, setCustomExamples] = useState<string[]>(override?.custom_examples || []);
  const [newCustomLine, setNewCustomLine] = useState("");

  const update = <K extends keyof EmotionalCategory>(k: K, v: EmotionalCategory[K]) => {
    setEdited({ ...edited, [k]: v });
  };

  async function save() {
    setSaving(true);
    try {
      // Save category fields (global)
      await fetch(`/api/creator/emotional-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edited),
      });
      // Save per-girl override custom_examples
      await fetch(`/api/creator/emotional-engine/${personaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrides: [
            {
              category_id: category.id,
              enabled_override: override?.enabled_override ?? null,
              override_patch: override?.override_patch || {},
              trigger_overrides: override?.trigger_overrides || {},
              style_overrides: override?.style_overrides || {},
              custom_examples: customExamples,
            },
          ],
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  async function addExample() {
    if (!newLine.trim()) return;
    const res = await fetch(`/api/creator/emotional-categories/${category.id}/examples`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line: newLine }),
    });
    if (res.ok) {
      const d = await res.json();
      setExList([...exList, d.example]);
      setNewLine("");
    }
  }

  async function deleteExample(id: string) {
    await fetch(`/api/creator/emotional-categories/${category.id}/examples`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setExList(exList.filter((e) => e.id !== id));
  }

  function addCustom() {
    if (!newCustomLine.trim()) return;
    setCustomExamples([...customExamples, newCustomLine.trim()]);
    setNewCustomLine("");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-white/40 hover:text-white text-sm">← Back to categories</button>
      </div>

      {/* Header */}
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
        <Field label="Display name">
          <input value={edited.display_name} onChange={(e) => update("display_name", e.target.value)} className="creator-input" />
        </Field>
        <Field label="Internal key">
          <input value={edited.internal_key} disabled className="creator-input font-mono opacity-60" />
        </Field>
        <Field label="Description">
          <textarea value={edited.description} onChange={(e) => update("description", e.target.value)} rows={2} className="creator-input resize-none" />
        </Field>
        <Field label="Value to app (creator notes)">
          <textarea value={edited.value_to_app} onChange={(e) => update("value_to_app", e.target.value)} rows={2} className="creator-input resize-none" />
        </Field>
      </div>

      {/* Style */}
      <Section title="Style">
        <Field label="Message mode">
          <select
            value={edited.paraphrase_mode}
            onChange={(e) => update("paraphrase_mode", e.target.value as ParaphraseMode)}
            className="creator-input"
          >
            <option value="paraphrase">Paraphrase Mode (default — style guidance)</option>
            <option value="exact">Exact Mode (use the line as written)</option>
            <option value="ai_generate">AI Generate Mode (fresh line in this direction)</option>
          </select>
        </Field>
        <Slider label="Paraphrase strength" value={edited.paraphrase_strength} onChange={(v) => update("paraphrase_strength", v)} max={10} />
        <Slider label="Intensity" value={edited.intensity} onChange={(v) => update("intensity", v)} max={10} />
        <Field label="Emotional tone">
          <input value={edited.emotional_tone} onChange={(e) => update("emotional_tone", e.target.value)} className="creator-input" placeholder="e.g. shy, flirty_then_shy, casual" />
        </Field>
      </Section>

      {/* Example lines */}
      <Section title="Example lines (style references)">
        <p className="text-white/40 text-xs">
          The AI uses these as <em>style guidance</em>, not scripts. She paraphrases them in her own voice.
        </p>
        <div className="space-y-2">
          {exList.map((ex) => (
            <div key={ex.id} className="flex items-start gap-2 bg-[#252538] rounded-xl px-3 py-2.5">
              <p className="text-white/80 text-sm flex-1 leading-snug">"{ex.line}"</p>
              <button onClick={() => deleteExample(ex.id)} className="text-red-400/50 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
          {exList.length === 0 && <p className="text-white/25 text-xs italic">No examples yet</p>}
        </div>
        <div className="flex gap-2">
          <input value={newLine} onChange={(e) => setNewLine(e.target.value)} placeholder="Add a style reference line..." className="creator-input flex-1" />
          <button onClick={addExample} className="gradient-bg text-white text-sm font-semibold px-3 py-2 rounded-xl">+ Add</button>
        </div>
      </Section>

      {/* Per-girl custom examples */}
      <Section title="Custom lines (this girl only)">
        <p className="text-white/40 text-xs">
          These get added on top of the global examples for {category.display_name} when this girl uses the category.
        </p>
        <div className="space-y-2">
          {customExamples.map((line, i) => (
            <div key={i} className="flex items-start gap-2 bg-[#252538] rounded-xl px-3 py-2.5">
              <p className="text-white/80 text-sm flex-1 leading-snug">"{line}"</p>
              <button onClick={() => setCustomExamples(customExamples.filter((_, j) => j !== i))} className="text-red-400/50 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newCustomLine} onChange={(e) => setNewCustomLine(e.target.value)} placeholder="Per-girl style line..." className="creator-input flex-1" />
          <button onClick={addCustom} className="gradient-bg text-white text-sm font-semibold px-3 py-2 rounded-xl">+ Add</button>
        </div>
      </Section>

      {/* Compatibility */}
      <Section title="Compatibility">
        <div className="grid grid-cols-2 gap-2">
          <Toggle on={edited.compat_image} onChange={() => update("compat_image", !edited.compat_image)} label="Images" />
          <Toggle on={edited.compat_video} onChange={() => update("compat_video", !edited.compat_video)} label="Videos" />
          <Toggle on={edited.compat_multi_media} onChange={() => update("compat_multi_media", !edited.compat_multi_media)} label="Multi-media sets" />
          <Toggle on={edited.compat_continue_chat} onChange={() => update("compat_continue_chat", !edited.compat_continue_chat)} label="Continue-chat" />
          <Toggle on={edited.compat_subscription} onChange={() => update("compat_subscription", !edited.compat_subscription)} label="Subscription" />
          <Toggle on={edited.compat_expiration} onChange={() => update("compat_expiration", !edited.compat_expiration)} label="Expiration" />
          <Toggle on={edited.compat_delayed_followup} onChange={() => update("compat_delayed_followup", !edited.compat_delayed_followup)} label="Delayed follow-up" />
        </div>
      </Section>

      {/* Placement */}
      <Section title="Placement">
        <div className="grid grid-cols-2 gap-2">
          <Toggle on={edited.place_normal_chat} onChange={() => update("place_normal_chat", !edited.place_normal_chat)} label="Normal chat" />
          <Toggle on={edited.place_before_media} onChange={() => update("place_before_media", !edited.place_before_media)} label="Before media" />
          <Toggle on={edited.place_after_media} onChange={() => update("place_after_media", !edited.place_after_media)} label="After media" />
          <Toggle on={edited.place_delayed_followup} onChange={() => update("place_delayed_followup", !edited.place_delayed_followup)} label="Delayed follow-up" />
          <Toggle on={edited.place_expiration_event} onChange={() => update("place_expiration_event", !edited.place_expiration_event)} label="Expiration event" />
          <Toggle on={edited.place_continue_chat} onChange={() => update("place_continue_chat", !edited.place_continue_chat)} label="Continue-chat" />
          <Toggle on={edited.place_subscription_prompt} onChange={() => update("place_subscription_prompt", !edited.place_subscription_prompt)} label="Subscription prompt" />
        </div>
      </Section>

      {/* Trigger criteria — high-level */}
      <Section title="Trigger criteria">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Min total messages" value={edited.min_total_messages} onChange={(v) => update("min_total_messages", v)} />
          <NumberField label="Min momentum (0-100)" value={edited.min_emotional_momentum_score} onChange={(v) => update("min_emotional_momentum_score", v)} />
          <NumberField label="Min trust (0-100)" value={edited.min_trust_score} onChange={(v) => update("min_trust_score", v)} />
          <NumberField label="Min vulnerability (0-100)" value={edited.min_vulnerability_score} onChange={(v) => update("min_vulnerability_score", v)} />
          <NumberField label="Min flirtiness (0-100)" value={edited.min_flirtiness_score} onChange={(v) => update("min_flirtiness_score", v)} />
          <NumberField label="Min engagement (0-100)" value={edited.min_engagement_score} onChange={(v) => update("min_engagement_score", v)} />
          <NumberField label="Min session seconds" value={edited.min_session_duration_seconds} onChange={(v) => update("min_session_duration_seconds", v)} />
          <NumberField label="Cooldown (sec)" value={edited.cooldown_seconds} onChange={(v) => update("cooldown_seconds", v)} />
          <NumberField label="Max per conversation" value={edited.max_same_category_uses_per_conversation} onChange={(v) => update("max_same_category_uses_per_conversation", v)} />
          <NumberField label="Max per day" value={edited.max_same_category_uses_per_day} onChange={(v) => update("max_same_category_uses_per_day", v)} />
          <NumberField label="Probability weight (1-100)" value={edited.probability_weight} onChange={(v) => update("probability_weight", v)} />
          <NumberField label="Sort order" value={edited.sort_order} onChange={(v) => update("sort_order", v)} />
        </div>
      </Section>

      {/* Save */}
      <div className="sticky bottom-0 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-[#0D0D1A] to-transparent">
        <button onClick={save} disabled={saving} className="w-full gradient-bg text-white font-semibold py-3 rounded-xl disabled:opacity-60">
          {saved ? "✓ Saved" : saving ? "Saving…" : "Save category"}
        </button>
      </div>
    </div>
  );
}

// ── Small UI atoms ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
      <p className="text-white font-semibold text-sm">{title}</p>
      {children}
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

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border transition-colors text-xs ${
        on ? "border-[#FF3CAC]/40 bg-[#FF3CAC]/10 text-white" : "border-white/10 bg-transparent text-white/40"
      }`}
    >
      <span>{label}</span>
      <span className={`w-7 h-3.5 rounded-full relative transition-colors ${on ? "bg-[#FF3CAC]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${on ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

function Slider({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-white/60 text-sm font-medium">{label}</label>
        <span className="text-[#FF3CAC] font-bold text-sm">{value}/{max}</span>
      </div>
      <input type="range" min={1} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full accent-[#FF3CAC] cursor-pointer" />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-white/50 text-xs">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value || "0"))} className="creator-input" />
    </div>
  );
}
