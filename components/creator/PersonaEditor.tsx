"use client";

import { useState } from "react";
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
}

type Tab = "profile" | "phrases" | "moments" | "continuation";

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

export default function PersonaEditor({ persona, phrases, moments, continuationPrompts }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState(persona.display_name);
  const [bio, setBio] = useState(persona.bio || "");
  const [warmth, setWarmth] = useState(persona.warmth);
  const [teaseLevel, setTeaseLevel] = useState(persona.tease_level);
  const [textingStyle, setTextingStyle] = useState(persona.texting_style);
  const [emojiStyle, setEmojiStyle] = useState(persona.emoji_style);
  const [sentenceLength, setSentenceLength] = useState(persona.sentence_length);
  const [isActive, setIsActive] = useState(persona.is_active);

  const avatarUrl = persona.avatar_url || PLACEHOLDER_AVATARS[persona.slug] || PLACEHOLDER_AVATARS["luna"];

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`/api/creator/personas/${persona.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          warmth,
          tease_level: teaseLevel,
          texting_style: textingStyle,
          emoji_style: emojiStyle,
          sentence_length: sentenceLength,
          is_active: isActive,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "profile", label: "Profile" },
    { id: "phrases", label: "Phrases", count: phrases.length },
    { id: "moments", label: "Moments", count: moments.length },
    { id: "continuation", label: "Continuation", count: continuationPrompts.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF3CAC] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#ff5cc0] transition-colors">
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <input type="file" accept="image/*" className="hidden" onChange={() => {}} />
          </label>
        </div>
        <div>
          <p className="text-white font-bold text-lg">{persona.display_name}</p>
          <p className="text-white/40 text-sm">@{persona.slug}</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => router.push(`/chat/${persona.slug}`)}
              className="text-xs text-[#FF3CAC] hover:underline"
            >
              Preview as user →
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1E1E30] border border-white/8 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "gradient-bg text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1 text-xs ${tab === t.id ? "text-white/70" : "text-white/25"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
      {tab === "phrases" && <PhrasesTab phrases={phrases} personaId={persona.id} />}
      {tab === "moments" && <MomentsTab moments={moments} personaId={persona.id} />}
      {tab === "continuation" && <ContinuationTab prompts={continuationPrompts} personaId={persona.id} personaName={persona.display_name} />}
    </div>
  );
}

// ── Profile Tab ──────────────────────────────────────────────
function ProfileTab({
  displayName, setDisplayName,
  bio, setBio,
  warmth, setWarmth,
  teaseLevel, setTeaseLevel,
  textingStyle, setTextingStyle,
  emojiStyle, setEmojiStyle,
  sentenceLength, setSentenceLength,
  isActive, setIsActive,
  onSave, saving, saved,
}: {
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
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="creator-input"
          placeholder="Luna"
        />
      </Field>

      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="creator-input resize-none"
          placeholder="Who is she in her own words..."
        />
      </Field>

      <SliderField label="Warmth" value={warmth} onChange={setWarmth} min={1} max={10}
        left="Cool & guarded" right="Warm & open" />
      <SliderField label="Tease Level" value={teaseLevel} onChange={setTeaseLevel} min={1} max={10}
        left="Sweet & wholesome" right="Playfully flirty" />

      <Field label="Texting Style">
        <select value={textingStyle} onChange={(e) => setTextingStyle(e.target.value)} className="creator-input">
          <option value="playful">Playful</option>
          <option value="flirty">Flirty</option>
          <option value="mysterious">Mysterious</option>
          <option value="wholesome">Wholesome</option>
          <option value="edgy">Edgy</option>
        </select>
      </Field>

      <Field label="Emoji Usage">
        <select value={emojiStyle} onChange={(e) => setEmojiStyle(e.target.value)} className="creator-input">
          <option value="heavy">Heavy (every message)</option>
          <option value="moderate">Moderate (every few)</option>
          <option value="none">Minimal</option>
        </select>
      </Field>

      <Field label="Message Length">
        <select value={sentenceLength} onChange={(e) => setSentenceLength(e.target.value)} className="creator-input">
          <option value="short">Short (1–2 sentences)</option>
          <option value="medium">Medium (2–4 sentences)</option>
          <option value="long">Long (expressive)</option>
        </select>
      </Field>

      <div className="flex items-center justify-between bg-[#1E1E30] border border-white/8 rounded-xl px-4 py-3">
        <div>
          <p className="text-white text-sm font-medium">Visible to users</p>
          <p className="text-white/40 text-xs mt-0.5">Show this girl on the selection screen</p>
        </div>
        <button
          onClick={() => setIsActive(!isActive)}
          className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? "bg-[#FF3CAC]" : "bg-white/20"}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full gradient-bg text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 glow-pink-sm"
      >
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save Profile"}
      </button>
    </div>
  );
}

// ── Phrases Tab ──────────────────────────────────────────────
function PhrasesTab({ phrases, personaId }: { phrases: Phrase[]; personaId: string }) {
  const groups: Record<string, Phrase[]> = {};
  phrases.forEach((p) => {
    if (!groups[p.phrase_type]) groups[p.phrase_type] = [];
    groups[p.phrase_type].push(p);
  });

  const TYPE_LABELS: Record<string, string> = {
    intro: "Intro Lines",
    signature: "Signature Phrases",
    pet_name: "Pet Names",
    teaser: "Teaser Hooks",
    upsell: "Approved Upsell Phrases",
  };

  return (
    <div className="space-y-5">
      <p className="text-white/40 text-sm">Creator-approved phrases only. The AI will not freestyle selling copy.</p>
      {Object.entries(TYPE_LABELS).map(([type, label]) => (
        <div key={type} className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
          <h3 className="text-white font-semibold text-sm mb-3">{label}</h3>
          <div className="space-y-2">
            {(groups[type] || []).map((phrase) => (
              <div key={phrase.id} className="flex items-start gap-2 bg-[#252538] rounded-xl px-3 py-2.5">
                <p className="text-white/80 text-sm flex-1 leading-snug">"{phrase.phrase}"</p>
                <span className="text-white/20 text-xs mt-0.5">w:{phrase.weight}</span>
              </div>
            ))}
            {(groups[type] || []).length === 0 && (
              <p className="text-white/25 text-xs italic">No {label.toLowerCase()} yet</p>
            )}
          </div>
          <button className="mt-3 text-[#FF3CAC] text-xs font-medium hover:underline">
            + Add phrase
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Moments Tab ──────────────────────────────────────────────
function MomentsTab({ moments, personaId }: { moments: Moment[]; personaId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{moments.length} moment{moments.length !== 1 ? "s" : ""} configured</p>
        <button className="text-sm gradient-bg text-white px-4 py-1.5 rounded-xl font-medium">
          + Add Moment
        </button>
      </div>
      {moments.map((moment) => (
        <div key={moment.id} className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-white font-semibold text-sm">{moment.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                moment.media_type === "video" ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"
              }`}>
                {moment.media_type === "video" ? "🎬 Video" : "📸 Image"}
              </span>
            </div>
            <span className="text-white font-semibold text-sm">${moment.price.toFixed(2)}</span>
          </div>
          <p className="text-white/50 text-xs leading-snug">"{moment.tease_copy}"</p>
          <div className="flex items-center gap-3 pt-1">
            <span className={`text-xs ${moment.is_active ? "text-green-400" : "text-white/30"}`}>
              {moment.is_active ? "Active" : "Hidden"}
            </span>
            <span className="text-white/25 text-xs">
              Auto-sidebar after {moment.sidebar_delay_minutes}m
            </span>
            {moment.media_url ? (
              <span className="text-green-400 text-xs">✓ Media uploaded</span>
            ) : (
              <button className="text-[#FF3CAC] text-xs hover:underline">Upload media</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Continuation Tab ─────────────────────────────────────────
function ContinuationTab({
  prompts,
  personaId,
  personaName,
}: {
  prompts: ContinuationPrompt[];
  personaId: string;
  personaName: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-white/40 text-sm">
        These lines appear as natural conversation endings before the $2 continuation popup.
      </p>
      {prompts.map((prompt) => (
        <div key={prompt.id} className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs bg-[#FF3CAC]/15 text-[#FF3CAC] px-2 py-0.5 rounded-full">
              {prompt.trigger_type === "message_count" ? "Message count" : "Emotion trigger"}
            </span>
            <span className="text-white/40 text-xs">{prompt.cooldown_minutes}m cooldown</span>
          </div>
          <div className="bg-[#252538] rounded-xl px-3 py-2.5">
            <p className="text-white/80 text-sm leading-snug">"{prompt.continuation_line}"</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-xs">Popup CTA: <span className="text-white/70">"{prompt.popup_cta}"</span></p>
            <span className="text-white font-semibold text-sm">${prompt.price.toFixed(2)}</span>
          </div>
        </div>
      ))}
      <button className="w-full border border-dashed border-white/15 text-white/40 hover:text-white/60 hover:border-white/25 py-3 rounded-xl text-sm transition-colors">
        + Add continuation prompt
      </button>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/60 text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function SliderField({
  label, value, onChange, min, max, left, right,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; left: string; right: string;
}) {
  return (
    <div className="bg-[#1E1E30] border border-white/8 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-white/60 text-sm font-medium">{label}</label>
        <span className="text-[#FF3CAC] font-bold text-sm">{value}/10</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[#FF3CAC] cursor-pointer"
      />
      <div className="flex justify-between">
        <span className="text-white/25 text-[11px]">{left}</span>
        <span className="text-white/25 text-[11px]">{right}</span>
      </div>
    </div>
  );
}
