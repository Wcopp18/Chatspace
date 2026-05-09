"use client";

import { useEffect, useState } from "react";

interface Moment {
  id: string;
  title: string;
  thumbnail_url: string | null;
  media_type: string;
  price: number;
  is_active?: boolean;
}

interface Bundle {
  id: string;
  persona_id: string;
  title: string;
  intro_line: string;
  intro_mode: "exact" | "paraphrase" | "ai_generate";
  price: number;
  rarity_tier: string;
  min_messages: number;
  min_momentum_score: number;
  requires_prior_unlock: boolean;
  cooldown_seconds: number;
  max_per_day: number;
  is_active: boolean;
  sort_order: number;
}

interface BundleItem {
  id: string;
  bundle_id: string;
  moment_id: string;
  sort_order: number;
  drip_message: string;
  moments?: Moment | Moment[] | null;
}

export default function BundlesEditor({
  personaId,
  moments,
}: {
  personaId: string;
  moments: Moment[];
}) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    void load();
  }, [personaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/bundles?personaId=${personaId}`);
      if (res.ok) {
        const d = await res.json();
        setBundles(d.bundles || []);
        setItems(d.items || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteBundle(id: string) {
    if (!confirm("Delete this bundle?")) return;
    await fetch(`/api/creator/bundles/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <div className="text-center py-8 text-white/30">Loading bundles…</div>;

  if (editing || showNew) {
    return (
      <BundleForm
        bundle={editing}
        personaId={personaId}
        moments={moments}
        currentItems={editing ? items.filter((i) => i.bundle_id === editing.id) : []}
        onClose={() => { setEditing(null); setShowNew(false); void load(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-1">Bundles</p>
        <p className="text-white/40 text-xs">
          Multi-moment sets she sends after a positive reaction. Triggered by the
          {" "}<code className="text-white/60 bg-black/30 px-1 rounded">OH_WAIT_THERES_MORE</code> emotional category.
          The girl never says a price — UI carries that.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="gradient-bg text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          + New Bundle
        </button>
      </div>

      <div className="space-y-3">
        {bundles.length === 0 && (
          <div className="text-center py-10 bg-[#1E1E30] rounded-2xl border border-white/5 text-white/40 text-sm">
            No bundles yet for this girl.
          </div>
        )}
        {bundles.map((b) => {
          const myItems = items.filter((i) => i.bundle_id === b.id);
          return (
            <div key={b.id} className={`bg-[#1E1E30] border rounded-2xl p-4 ${b.is_active ? "border-white/10" : "border-white/5 opacity-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm">{b.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-[#FF3CAC] font-bold">${Number(b.price).toFixed(2)}</span>
                    <span className="text-white/40">{myItems.length} items</span>
                    <span className="text-white/40">min msgs {b.min_messages}</span>
                    <span className="text-white/40">min momentum {b.min_momentum_score}</span>
                  </div>
                  {b.intro_line && (
                    <p className="text-white/50 text-xs italic mt-2">"{b.intro_line}"</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => setEditing(b)} className="text-xs gradient-bg text-white px-3 py-1.5 rounded-lg font-medium">Edit</button>
                  <button onClick={() => deleteBundle(b.id)} className="text-xs text-red-400/60 hover:text-red-400 px-3 py-1.5 rounded-lg border border-red-500/15">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BundleForm({
  bundle,
  personaId,
  moments,
  currentItems,
  onClose,
}: {
  bundle: Bundle | null;
  personaId: string;
  moments: Moment[];
  currentItems: BundleItem[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(bundle?.title || "");
  const [introLine, setIntroLine] = useState(bundle?.intro_line || "wait there's more 😭");
  const [introMode, setIntroMode] = useState<Bundle["intro_mode"]>(bundle?.intro_mode || "paraphrase");
  const [price, setPrice] = useState(bundle?.price ?? 9.99);
  const [minMessages, setMinMessages] = useState(bundle?.min_messages ?? 10);
  const [minMomentum, setMinMomentum] = useState(bundle?.min_momentum_score ?? 55);
  const [maxPerDay, setMaxPerDay] = useState(bundle?.max_per_day ?? 1);
  const [isActive, setIsActive] = useState(bundle?.is_active ?? true);
  const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>(
    currentItems.map((i) => i.moment_id),
  );
  const [saving, setSaving] = useState(false);

  function toggleMoment(id: string) {
    setSelectedMomentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        persona_id: personaId,
        title,
        intro_line: introLine,
        intro_mode: introMode,
        price,
        min_messages: minMessages,
        min_momentum_score: minMomentum,
        max_per_day: maxPerDay,
        is_active: isActive,
        moment_ids: selectedMomentIds,
      };
      if (bundle) {
        await fetch(`/api/creator/bundles/${bundle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/creator/bundles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="text-white/40 hover:text-white text-sm">← Back to bundles</button>

      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
        <Field label="Bundle title (creator-only)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="creator-input" placeholder="e.g. Late Night Set" />
        </Field>
        <Field label="Intro line — the 'wait there's more' beat">
          <textarea value={introLine} onChange={(e) => setIntroLine(e.target.value)} rows={2} className="creator-input resize-none" />
        </Field>
        <Field label="Mode">
          <select value={introMode} onChange={(e) => setIntroMode(e.target.value as Bundle["intro_mode"])} className="creator-input">
            <option value="paraphrase">Paraphrase (style guidance)</option>
            <option value="exact">Exact (use this line)</option>
            <option value="ai_generate">AI Generate (fresh each time)</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price ($)">
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value || "0"))} className="creator-input" />
          </Field>
          <Field label="Max per day per user">
            <input type="number" value={maxPerDay} onChange={(e) => setMaxPerDay(parseInt(e.target.value || "1"))} className="creator-input" />
          </Field>
          <Field label="Min messages">
            <input type="number" value={minMessages} onChange={(e) => setMinMessages(parseInt(e.target.value || "0"))} className="creator-input" />
          </Field>
          <Field label="Min momentum (0-100)">
            <input type="number" value={minMomentum} onChange={(e) => setMinMomentum(parseInt(e.target.value || "0"))} className="creator-input" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-white/70 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>

      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">Pick moments for this bundle ({selectedMomentIds.length} selected)</p>
        <div className="grid grid-cols-2 gap-2">
          {moments.map((m) => {
            const on = selectedMomentIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMoment(m.id)}
                className={`text-left rounded-xl p-2 border transition-colors ${
                  on ? "border-[#FF3CAC] bg-[#FF3CAC]/10" : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="aspect-video w-full bg-[#252538] rounded-md overflow-hidden mb-1">
                  {m.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-white text-xs font-medium truncate">{m.title}</p>
                <p className="text-white/40 text-[11px]">{m.media_type} · ${Number(m.price).toFixed(2)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={save} disabled={saving || !title.trim()} className="w-full gradient-bg text-white font-semibold py-3 rounded-xl disabled:opacity-60">
        {saving ? "Saving…" : bundle ? "Save Bundle" : "Create Bundle"}
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
