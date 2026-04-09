"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Phrase = Database["public"]["Tables"]["persona_phrase_bank"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"];
type ContinuationPrompt = Database["public"]["Tables"]["continuation_prompts"]["Row"];

interface Props {
  persona: Persona;
  phrases: Phrase[];
  moments: Moment[];
  continuationPrompts: ContinuationPrompt[];
  personaId?: string;
}

type Tab = "profile" | "phrases" | "moments" | "continuation" | "promotions" | "tension";

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

export default function PersonaEditor({ persona, phrases: initialPhrases, moments: initialMoments, continuationPrompts: initialPrompts, personaId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(persona.avatar_url || PLACEHOLDER_AVATARS[persona.slug] || PLACEHOLDER_AVATARS["luna"]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [phrases, setPhrases] = useState<Phrase[]>(initialPhrases);
  const [moments, setMoments] = useState<Moment[]>(initialMoments);
  const [prompts, setPrompts] = useState<ContinuationPrompt[]>(initialPrompts);

  // Profile state
  const [displayName, setDisplayName] = useState(persona.display_name);
  const [bio, setBio] = useState(persona.bio || "");
  const [warmth, setWarmth] = useState(persona.warmth);
  const [teaseLevel, setTeaseLevel] = useState(persona.tease_level);
  const [textingStyle, setTextingStyle] = useState(persona.texting_style);
  const [emojiStyle, setEmojiStyle] = useState(persona.emoji_style);
  const [sentenceLength, setSentenceLength] = useState(persona.sentence_length);
  const [isActive, setIsActive] = useState(persona.is_active);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`/api/creator/personas/${persona.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio, warmth, tease_level: teaseLevel, texting_style: textingStyle, emoji_style: emojiStyle, sentence_length: sentenceLength, is_active: isActive }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); }
    } finally { setSaving(false); }
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/creator/personas/${persona.id}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setAvatarUrl(data.url);
    } finally { setUploadingAvatar(false); }
  }

  const [promoRefreshKey, setPromoRefreshKey] = useState(0);
  const [editingPromo, setEditingPromo] = useState<import("@/types/promotions").Promotion | null>(null);
  const [showPromoEditor, setShowPromoEditor] = useState(false);

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "profile", label: "Profile" },
    { id: "phrases", label: "Phrases", count: phrases.filter(p => p.is_active).length },
    { id: "moments", label: "Moments", count: moments.filter(m => m.is_active).length },
    { id: "continuation", label: "Continuation", count: prompts.filter(p => p.is_active).length },
    { id: "promotions", label: "Promotions" },
    { id: "tension", label: "Tension Meter" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/creator" className="text-white/40 hover:text-white transition-colors text-sm">← All Girls</a>
        <span className="text-white/20">/</span>
        <span className="text-white font-semibold">{persona.display_name}</span>
      </div>

      {/* Avatar + name hero */}
      <div className="flex items-center gap-4 bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-[#FF3CAC]/30">
            <Image src={avatarUrl} alt={persona.display_name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF3CAC] rounded-full flex items-center justify-center hover:bg-[#ff5cc0] transition-colors disabled:opacity-60"
          >
            {uploadingAvatar ? <span className="text-white text-[8px]">…</span> : (
              <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
        </div>
        <div>
          <p className="text-white font-bold text-lg">{persona.display_name}</p>
          <p className="text-white/40 text-sm">@{persona.slug}</p>
          <button onClick={() => router.push(`/chat/${persona.slug}`)} className="text-xs text-[#FF3CAC] hover:underline mt-1">
            Preview as user →
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1E1E30] border border-white/8 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? "gradient-bg text-white" : "text-white/40 hover:text-white/70"}`}>
            {t.label}{t.count !== undefined && <span className={`ml-1 ${tab === t.id ? "text-white/70" : "text-white/25"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <ProfileTab
          displayName={displayName} setDisplayName={setDisplayName}
          bio={bio} setBio={setBio}
          warmth={warmth} setWarmth={setWarmth}
          teaseLevel={teaseLevel} setTeaseLevel={setTeaseLevel}
          textingStyle={textingStyle} setTextingStyle={setTextingStyle}
          emojiStyle={emojiStyle} setEmojiStyle={setEmojiStyle}
          sentenceLength={sentenceLength} setSentenceLength={setSentenceLength}
          isActive={isActive} setIsActive={setIsActive}
          onSave={saveProfile} saving={saving} saved={saved}
        />
      )}
      {tab === "phrases" && <PhrasesTab phrases={phrases} setPhrases={setPhrases} personaId={persona.id} />}
      {tab === "moments" && <MomentsTab moments={moments} setMoments={setMoments} personaId={persona.id} />}
      {tab === "continuation" && <ContinuationTab prompts={prompts} setPrompts={setPrompts} personaId={persona.id} personaName={persona.display_name} />}
      {tab === "promotions" && (
        <PromotionsTab
          personaId={personaId || persona.id}
          personaName={persona.display_name}
          editingPromo={editingPromo}
          setEditingPromo={setEditingPromo}
          showEditor={showPromoEditor}
          setShowEditor={setShowPromoEditor}
          refreshKey={promoRefreshKey}
          setRefreshKey={setPromoRefreshKey}
        />
      )}
      {tab === "tension" && (
        <TensionTipsTab personaId={persona.id} personaName={persona.display_name} />
      )}
    </div>
  );
}

// ── Profile Tab ──────────────────────────────────────────────
function ProfileTab({ displayName, setDisplayName, bio, setBio, warmth, setWarmth, teaseLevel, setTeaseLevel, textingStyle, setTextingStyle, emojiStyle, setEmojiStyle, sentenceLength, setSentenceLength, isActive, setIsActive, onSave, saving, saved }: {
  displayName: string; setDisplayName: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  warmth: number; setWarmth: (v: number) => void;
  teaseLevel: number; setTeaseLevel: (v: number) => void;
  textingStyle: string; setTextingStyle: (v: string) => void;
  emojiStyle: string; setEmojiStyle: (v: string) => void;
  sentenceLength: string; setSentenceLength: (v: string) => void;
  isActive: boolean; setIsActive: (v: boolean) => void;
  onSave: () => void; saving: boolean; saved: boolean;
}) {
  return (
    <div className="space-y-4">
      <Field label="Display Name">
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="creator-input" placeholder="Luna" />
      </Field>
      <Field label="Bio">
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="creator-input resize-none" placeholder="Who is she in her own words..." />
      </Field>
      <SliderField label="Warmth" value={warmth} onChange={setWarmth} min={1} max={10} left="Cool & guarded" right="Warm & open" />
      <SliderField label="Tease Level" value={teaseLevel} onChange={setTeaseLevel} min={1} max={10} left="Sweet & wholesome" right="Playfully flirty" />
      <Field label="Texting Style">
        <select value={textingStyle} onChange={e => setTextingStyle(e.target.value)} className="creator-input">
          <option value="playful">Playful</option>
          <option value="flirty">Flirty</option>
          <option value="mysterious">Mysterious</option>
          <option value="wholesome">Wholesome</option>
          <option value="edgy">Edgy</option>
        </select>
      </Field>
      <Field label="Emoji Usage">
        <select value={emojiStyle} onChange={e => setEmojiStyle(e.target.value)} className="creator-input">
          <option value="heavy">Heavy (every message)</option>
          <option value="moderate">Moderate (every few)</option>
          <option value="none">Minimal</option>
        </select>
      </Field>
      <Field label="Message Length">
        <select value={sentenceLength} onChange={e => setSentenceLength(e.target.value)} className="creator-input">
          <option value="short">Short (1–2 sentences)</option>
          <option value="medium">Medium (2–4 sentences)</option>
          <option value="long">Long (expressive)</option>
        </select>
      </Field>
      <div className="flex items-center justify-between bg-[#1E1E30] border border-white/8 rounded-xl px-4 py-3">
        <div>
          <p className="text-white text-sm font-medium">Visible to users</p>
          <p className="text-white/40 text-xs mt-0.5">Show on selection screen</p>
        </div>
        <button onClick={() => setIsActive(!isActive)} className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? "bg-[#FF3CAC]" : "bg-white/20"}`}>
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>
      <button onClick={onSave} disabled={saving} className="w-full gradient-bg text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 glow-pink-sm">
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save Profile"}
      </button>
    </div>
  );
}

// ── Phrases Tab ──────────────────────────────────────────────
function PhrasesTab({ phrases, setPhrases, personaId }: { phrases: Phrase[]; setPhrases: (p: Phrase[]) => void; personaId: string }) {
  const [newType, setNewType] = useState("intro");
  const [newPhrase, setNewPhrase] = useState("");
  const [newWeight, setNewWeight] = useState(2);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const TYPE_LABELS: Record<string, string> = {
    intro: "Intro Lines",
    signature: "Signature Phrases",
    pet_name: "Pet Names",
    teaser: "Teaser Hooks",
    upsell: "Approved Upsell Phrases",
  };

  async function addPhrase() {
    if (!newPhrase.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/creator/phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: personaId, phrase_type: newType, phrase: newPhrase.trim(), weight: newWeight }),
      });
      const data = await res.json();
      if (data.phrase) { setPhrases([...phrases, data.phrase]); setNewPhrase(""); }
    } finally { setAdding(false); }
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/creator/phrases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase: editText }),
    });
    const data = await res.json();
    if (data.phrase) { setPhrases(phrases.map(p => p.id === id ? data.phrase : p)); setEditingId(null); }
  }

  async function deletePhrase(id: string) {
    await fetch(`/api/creator/phrases/${id}`, { method: "DELETE" });
    setPhrases(phrases.map(p => p.id === id ? { ...p, is_active: false } : p));
  }

  const active = phrases.filter(p => p.is_active);
  const groups: Record<string, Phrase[]> = {};
  active.forEach(p => { if (!groups[p.phrase_type]) groups[p.phrase_type] = []; groups[p.phrase_type].push(p); });

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">Add Phrase</p>
        <select value={newType} onChange={e => setNewType(e.target.value)} className="creator-input">
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <textarea value={newPhrase} onChange={e => setNewPhrase(e.target.value)} placeholder="Type the phrase..." rows={2} className="creator-input resize-none" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-white/40 text-xs">Weight</label>
            <input type="number" min={1} max={5} value={newWeight} onChange={e => setNewWeight(parseInt(e.target.value))} className="creator-input w-16 py-1.5" />
          </div>
          <button onClick={addPhrase} disabled={adding || !newPhrase.trim()} className="gradient-bg text-white text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-50">
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>

      {/* Grouped phrases */}
      {Object.entries(TYPE_LABELS).map(([type, label]) => (
        <div key={type} className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
          <h3 className="text-white font-semibold text-sm mb-3">{label} <span className="text-white/30 font-normal">({(groups[type] || []).length})</span></h3>
          <div className="space-y-2">
            {(groups[type] || []).map(phrase => (
              <div key={phrase.id} className="flex items-start gap-2 bg-[#252538] rounded-xl px-3 py-2.5">
                {editingId === phrase.id ? (
                  <>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} className="flex-1 bg-transparent text-white/90 text-sm resize-none focus:outline-none" />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => saveEdit(phrase.id)} className="text-green-400 text-xs hover:text-green-300">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-white/30 text-xs hover:text-white/50">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-white/80 text-sm flex-1 leading-snug">"{phrase.phrase}"</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-white/20 text-xs">w:{phrase.weight}</span>
                      <button onClick={() => { setEditingId(phrase.id); setEditText(phrase.phrase); }} className="text-white/30 hover:text-white/70 transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => deletePhrase(phrase.id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(groups[type] || []).length === 0 && <p className="text-white/25 text-xs italic">No {label.toLowerCase()} yet</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Moments Tab ──────────────────────────────────────────────
function MomentsTab({ moments, setMoments, personaId }: { moments: Moment[]; setMoments: (m: Moment[]) => void; personaId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTease, setNewTease] = useState("");
  const [newType, setNewType] = useState("image");
  const [newPrice, setNewPrice] = useState(2.99);
  const [newDelay, setNewDelay] = useState(10);
  const [adding, setAdding] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [activeUploadType, setActiveUploadType] = useState<"media" | "thumbnail">("media");

  const active = moments.filter(m => m.is_active);

  async function addMoment() {
    if (!newTitle.trim() || !newTease.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/creator/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: personaId, title: newTitle, tease_copy: newTease, media_type: newType, price: newPrice, sidebar_delay_minutes: newDelay }),
      });
      const data = await res.json();
      if (data.moment) { setMoments([...moments, data.moment]); setShowAdd(false); setNewTitle(""); setNewTease(""); }
    } finally { setAdding(false); }
  }

  async function deleteMoment(id: string) {
    await fetch(`/api/creator/moments/${id}`, { method: "DELETE" });
    setMoments(moments.map(m => m.id === id ? { ...m, is_active: false } : m));
  }

  async function uploadFile(id: string, file: File, type: "media" | "thumbnail") {
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch(`/api/creator/moments/${id}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setMoments(moments.map(m => m.id === id ? { ...m, [type === "thumbnail" ? "thumbnail_url" : "media_url"]: data.url } : m));
      }
    } finally { setUploadingId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{active.length} active moment{active.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-sm gradient-bg text-white px-4 py-1.5 rounded-xl font-medium">
          {showAdd ? "Cancel" : "+ Add Moment"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#1E1E30] border border-[#FF3CAC]/20 rounded-2xl p-4 space-y-3">
          <p className="text-white font-semibold text-sm">New Moment</p>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title (e.g. Late Night Thoughts)" className="creator-input" />
          <textarea value={newTease} onChange={e => setNewTease(e.target.value)} placeholder="Tease copy shown before unlock..." rows={2} className="creator-input resize-none" />
          <div className="flex gap-3">
            <select value={newType} onChange={e => { setNewType(e.target.value); setNewPrice(e.target.value === "video" ? 4.99 : 2.99); }} className="creator-input flex-1">
              <option value="image">📸 Image</option>
              <option value="video">🎬 Video</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">$</span>
              <input type="number" value={newPrice} onChange={e => setNewPrice(parseFloat(e.target.value))} step="0.01" className="creator-input w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-white/40 text-xs">Auto-sidebar after</label>
            <input type="number" value={newDelay} onChange={e => setNewDelay(parseInt(e.target.value))} className="creator-input w-16 py-1.5" />
            <span className="text-white/40 text-xs">min</span>
          </div>
          <button onClick={addMoment} disabled={adding || !newTitle.trim()} className="w-full gradient-bg text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
            {adding ? "Creating…" : "Create Moment"}
          </button>
        </div>
      )}

      <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0];
        if (f && activeUploadId) uploadFile(activeUploadId, f, activeUploadType);
        e.target.value = "";
      }} />
      <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0];
        if (f && activeUploadId) uploadFile(activeUploadId, f, "thumbnail");
        e.target.value = "";
      }} />

      {active.map(moment => (
        <div key={moment.id} className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-white font-semibold text-sm">{moment.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${moment.media_type === "video" ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"}`}>
                {moment.media_type === "video" ? "🎬 Video" : "📸 Image"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">${Number(moment.price).toFixed(2)}</span>
              <button onClick={() => deleteMoment(moment.id)} className="text-red-400/40 hover:text-red-400 transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
          <p className="text-white/50 text-xs leading-snug">"{moment.tease_copy}"</p>

          {/* Thumbnail */}
          {moment.thumbnail_url ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#252538]">
              <Image src={moment.thumbnail_url} alt="thumbnail" fill className="object-cover" unoptimized />
              <button
                onClick={() => { setActiveUploadId(moment.id); setActiveUploadType("thumbnail"); thumbInputRef.current?.click(); }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-medium"
              >
                Replace thumbnail
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setActiveUploadId(moment.id); setActiveUploadType("thumbnail"); thumbInputRef.current?.click(); }}
              disabled={uploadingId === moment.id}
              className="w-full border border-dashed border-white/15 text-white/40 hover:text-white/60 hover:border-white/30 py-3 rounded-xl text-xs transition-colors"
            >
              {uploadingId === moment.id ? "Uploading…" : "↑ Upload thumbnail (shown blurred)"}
            </button>
          )}

          {/* Media */}
          <div className="flex items-center justify-between">
            {moment.media_url ? (
              <span className="text-green-400 text-xs">✓ {moment.media_type === "video" ? "Video" : "Image"} uploaded</span>
            ) : (
              <span className="text-white/30 text-xs">No media yet</span>
            )}
            <button
              onClick={() => { setActiveUploadId(moment.id); setActiveUploadType("media"); mediaInputRef.current?.click(); }}
              disabled={uploadingId === moment.id}
              className="text-[#FF3CAC] text-xs hover:underline disabled:opacity-50"
            >
              {uploadingId === moment.id ? "Uploading…" : moment.media_url ? "Replace media" : "↑ Upload media"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Continuation Tab ─────────────────────────────────────────
function ContinuationTab({ prompts, setPrompts, personaId, personaName }: { prompts: ContinuationPrompt[]; setPrompts: (p: ContinuationPrompt[]) => void; personaId: string; personaName: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTrigger, setNewTrigger] = useState("message_count");
  const [newLine, setNewLine] = useState("");
  const [newCta, setNewCta] = useState("");
  const [newPrice, setNewPrice] = useState(2.00);
  const [newCooldown, setNewCooldown] = useState(30);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLine, setEditLine] = useState("");
  const [editCta, setEditCta] = useState("");

  const active = prompts.filter(p => p.is_active);

  async function addPrompt() {
    if (!newLine.trim() || !newCta.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/creator/continuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: personaId, trigger_type: newTrigger, continuation_line: newLine, popup_cta: newCta, price: newPrice, cooldown_minutes: newCooldown }),
      });
      const data = await res.json();
      if (data.prompt) { setPrompts([...prompts, data.prompt]); setShowAdd(false); setNewLine(""); setNewCta(""); }
    } finally { setAdding(false); }
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/creator/continuation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ continuation_line: editLine, popup_cta: editCta }),
    });
    const data = await res.json();
    if (data.prompt) { setPrompts(prompts.map(p => p.id === id ? data.prompt : p)); setEditingId(null); }
  }

  async function deletePrompt(id: string) {
    await fetch(`/api/creator/continuation/${id}`, { method: "DELETE" });
    setPrompts(prompts.map(p => p.id === id ? { ...p, is_active: false } : p));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">Shown before the $2 continuation popup</p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-sm gradient-bg text-white px-4 py-1.5 rounded-xl font-medium">
          {showAdd ? "Cancel" : "+ Add Prompt"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#1E1E30] border border-[#FF3CAC]/20 rounded-2xl p-4 space-y-3">
          <p className="text-white font-semibold text-sm">New Continuation Prompt</p>
          <Field label="Trigger">
            <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)} className="creator-input">
              <option value="message_count">Message count (every 20 msgs)</option>
              <option value="emotion_score">Emotion score (≥ 0.7)</option>
            </select>
          </Field>
          <Field label="Emotional line (what she says)">
            <textarea value={newLine} onChange={e => setNewLine(e.target.value)} rows={2} placeholder={`i don't want this to end...`} className="creator-input resize-none" />
          </Field>
          <Field label="Popup CTA button text">
            <input value={newCta} onChange={e => setNewCta(e.target.value)} placeholder={`Stay with ${personaName} • $2.00`} className="creator-input" />
          </Field>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <label className="text-white/40 text-xs">Price $</label>
              <input type="number" value={newPrice} onChange={e => setNewPrice(parseFloat(e.target.value))} step="0.50" className="creator-input w-20" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-white/40 text-xs">Cooldown</label>
              <input type="number" value={newCooldown} onChange={e => setNewCooldown(parseInt(e.target.value))} className="creator-input w-16" />
              <span className="text-white/40 text-xs">min</span>
            </div>
          </div>
          <button onClick={addPrompt} disabled={adding || !newLine.trim()} className="w-full gradient-bg text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
            {adding ? "Adding…" : "Add Prompt"}
          </button>
        </div>
      )}

      {active.map(prompt => (
        <div key={prompt.id} className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs bg-[#FF3CAC]/15 text-[#FF3CAC] px-2 py-0.5 rounded-full">
              {prompt.trigger_type === "message_count" ? "Message count" : "Emotion trigger"}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-xs">{prompt.cooldown_minutes}m cooldown</span>
              <button onClick={() => { setEditingId(prompt.id); setEditLine(prompt.continuation_line); setEditCta(prompt.popup_cta); }} className="text-white/30 hover:text-white/70">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={() => deletePrompt(prompt.id)} className="text-red-400/40 hover:text-red-400">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {editingId === prompt.id ? (
            <div className="space-y-2">
              <textarea value={editLine} onChange={e => setEditLine(e.target.value)} rows={2} className="creator-input resize-none text-sm" />
              <input value={editCta} onChange={e => setEditCta(e.target.value)} className="creator-input text-sm" />
              <div className="flex gap-2">
                <button onClick={() => saveEdit(prompt.id)} className="gradient-bg text-white text-xs px-4 py-1.5 rounded-lg">Save</button>
                <button onClick={() => setEditingId(null)} className="text-white/30 text-xs px-3 py-1.5 rounded-lg hover:text-white/50">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#252538] rounded-xl px-3 py-2.5">
                <p className="text-white/80 text-sm leading-snug">"{prompt.continuation_line}"</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-xs">CTA: <span className="text-white/70">"{prompt.popup_cta}"</span></p>
                <span className="text-white font-semibold text-sm">${Number(prompt.price).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/60 text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, left, right }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; left: string; right: string }) {
  return (
    <div className="bg-[#1E1E30] border border-white/8 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-white/60 text-sm font-medium">{label}</label>
        <span className="text-[#FF3CAC] font-bold text-sm">{value}/10</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))} className="w-full accent-[#FF3CAC] cursor-pointer" />
      <div className="flex justify-between">
        <span className="text-white/25 text-[11px]">{left}</span>
        <span className="text-white/25 text-[11px]">{right}</span>
      </div>
    </div>
  );
}

// ── Promotions Tab ──────────────────────────────────────────
function PromotionsTab({ personaId, personaName, editingPromo, setEditingPromo, showEditor, setShowEditor, refreshKey, setRefreshKey }: {
  personaId: string;
  personaName: string;
  editingPromo: import("@/types/promotions").Promotion | null;
  setEditingPromo: (p: import("@/types/promotions").Promotion | null) => void;
  showEditor: boolean;
  setShowEditor: (v: boolean) => void;
  refreshKey: number;
  setRefreshKey: (fn: (k: number) => number) => void;
}) {
  const [promotions, setPromotions] = useState<import("@/types/promotions").Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function fetchPromotions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/promotions?personaId=${personaId}`);
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions || []);
      }
    } catch (e) { console.error("Failed to load promotions:", e); }
    setLoading(false);
  }

  async function handleSave(promo: Partial<import("@/types/promotions").Promotion>) {
    const isNew = !promo.id;
    const payload = { ...promo, recommendedPersonaIds: [personaId] };
    const res = await fetch("/api/promotions", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setRefreshKey((k: number) => k + 1);
      setShowEditor(false);
      setEditingPromo(null);
    }
  }

  async function handleToggle(promo: import("@/types/promotions").Promotion) {
    await fetch("/api/promotions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...promo, status: promo.status === "active" ? "disabled" : "active" }),
    });
    setRefreshKey((k: number) => k + 1);
  }

  async function handleDelete(id: string) {
    await fetch("/api/promotions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  }

  if (showEditor) {
    const PromotionEditor = require("@/components/creator/PromotionEditor").default;
    return (
      <PromotionEditor
        promotion={editingPromo}
        personas={[{ id: personaId, displayName: personaName, slug: "" }]}
        onSave={handleSave}
        onCancel={() => { setShowEditor(false); setEditingPromo(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">{personaName}&apos;s promotions</p>
        <button
          onClick={() => { setEditingPromo(null); setShowEditor(true); }}
          className="gradient-bg text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          + New Promotion
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/30">Loading...</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-12 bg-[#1E1E30] rounded-2xl border border-white/5">
          <p className="text-white/40 text-sm">No promotions yet for {personaName}</p>
          <button
            onClick={() => { setEditingPromo(null); setShowEditor(true); }}
            className="mt-3 text-[#FF3CAC] text-sm font-medium hover:underline"
          >
            Create first promotion
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {promotions.map((promo) => (
            <div key={promo.id} className="bg-[#1E1E30] border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{promo.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      promo.status === "active" ? "bg-green-400/15 text-green-400"
                        : promo.status === "archived" ? "bg-red-400/15 text-red-400"
                        : "bg-white/10 text-white/40"
                    }`}>
                      {promo.status}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs mt-0.5">{promo.type.replace("_", " ")}{promo.promoPrice ? " · $" + promo.promoPrice : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(promo)} className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                    {promo.status === "active" ? "Pause" : "Activate"}
                  </button>
                  <button onClick={() => { setEditingPromo(promo); setShowEditor(true); }} className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(promo.id)} className="text-red-400/40 hover:text-red-400 text-xs px-2 py-1 rounded-lg border border-red-500/10 hover:border-red-500/30 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tension Meter Tips Tab ──────────────────────────────────
function TensionTipsTab({ personaId, personaName }: { personaId: string; personaName: string }) {
  const [intro, setIntro] = useState("");
  const [riseTips, setRiseTips] = useState<string[]>([""]);
  const [fallTips, setFallTips] = useState<string[]>([""]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadTips();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId]);

  async function loadTips() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/personas/${personaId}`);
      if (res.ok) {
        const data = await res.json();
        setIntro(data.persona?.tension_intro || "");
        const rise = data.persona?.tension_tips_rise;
        const fall = data.persona?.tension_tips_fall;
        setRiseTips(rise && rise.length > 0 ? rise : [""]);
        setFallTips(fall && fall.length > 0 ? fall : [""]);
      }
    } catch (e) { console.error("Failed to load tension tips:", e); }
    setLoading(false);
  }

  async function saveTips() {
    setSaving(true);
    try {
      const res = await fetch(`/api/creator/personas/${personaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tension_intro: intro,
          tension_tips_rise: riseTips.filter(t => t.trim()),
          tension_tips_fall: fallTips.filter(t => t.trim()),
        }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setSaving(false); }
  }

  function updateTip(list: string[], setList: (v: string[]) => void, index: number, value: string) {
    const updated = [...list];
    updated[index] = value;
    setList(updated);
  }

  function addTip(list: string[], setList: (v: string[]) => void) {
    setList([...list, ""]);
  }

  function removeTip(list: string[], setList: (v: string[]) => void, index: number) {
    if (list.length <= 1) return;
    setList(list.filter((_, i) => i !== index));
  }

  if (loading) return <div className="text-center py-12 text-white/30">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Intro / Description */}
      <div>
        <label className="text-white/70 text-sm font-medium block mb-2">
          Tension Meter Intro for {personaName}
        </label>
        <p className="text-white/30 text-xs mb-2">
          A short intro shown to users about how the tension meter works with this girl. Make it feel personal.
        </p>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder={`e.g. "${personaName} responds to how you vibe with her. Keep the energy right and she might show you something special..."`}
          rows={3}
          className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#FF3CAC]/50 text-sm resize-none"
        />
      </div>

      {/* Rise Tips */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-400 text-lg">▲</span>
          <label className="text-white/70 text-sm font-medium">What Makes It Rise</label>
        </div>
        <p className="text-white/30 text-xs mb-3">
          Tips the user sees on how to build momentum with {personaName}. Be specific to her personality.
        </p>
        <div className="space-y-2">
          {riseTips.map((tip, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={tip}
                onChange={(e) => updateTip(riseTips, setRiseTips, i, e.target.value)}
                placeholder={`e.g. "Compliment her music taste — she'll melt"`}
                className="flex-1 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-green-500/50 text-sm"
              />
              {riseTips.length > 1 && (
                <button onClick={() => removeTip(riseTips, setRiseTips, i)} className="text-red-400/40 hover:text-red-400 px-2 transition-colors">
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addTip(riseTips, setRiseTips)}
            className="text-green-400/60 hover:text-green-400 text-sm font-medium transition-colors"
          >
            + Add tip
          </button>
        </div>
      </div>

      {/* Fall Tips */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-400 text-lg">▼</span>
          <label className="text-white/70 text-sm font-medium">What Makes It Fall</label>
        </div>
        <p className="text-white/30 text-xs mb-3">
          Tips on what kills the vibe with {personaName}. Warn users what to avoid.
        </p>
        <div className="space-y-2">
          {fallTips.map((tip, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={tip}
                onChange={(e) => updateTip(fallTips, setFallTips, i, e.target.value)}
                placeholder={`e.g. "Don't ask for pics right away — she hates that"`}
                className="flex-1 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 text-sm"
              />
              {fallTips.length > 1 && (
                <button onClick={() => removeTip(fallTips, setFallTips, i)} className="text-red-400/40 hover:text-red-400 px-2 transition-colors">
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addTip(fallTips, setFallTips)}
            className="text-red-400/60 hover:text-red-400 text-sm font-medium transition-colors"
          >
            + Add tip
          </button>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={saveTips}
        disabled={saving}
        className="w-full gradient-bg text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Tension Tips"}
      </button>
    </div>
  );
}
