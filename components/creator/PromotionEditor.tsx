"use client";

import { useState } from "react";
import { getDefaultTriggerRules, createDefaultPromotion } from "@/lib/engine/event-engine";
import type { Promotion, PromotionType, TriggerRules } from "@/types/promotions";

// ── Reusable preview components (inline) ──
import MediaTeaserCard from "@/components/chat/events/MediaTeaserCard";
import TimerUrgencyCard from "@/components/chat/events/TimerUrgencyCard";
import BundleRail from "@/components/chat/events/BundleRail";
import RewardProgressCard from "@/components/chat/events/RewardProgressCard";

interface PersonaOption {
  id: string;
  displayName: string;
  slug: string;
}

interface Props {
  promotion?: Promotion | null;
  personas: PersonaOption[];
  onSave: (data: Partial<Promotion>) => void;
  onCancel: () => void;
  saving?: boolean;
}

const TYPE_OPTIONS: { value: PromotionType; label: string; icon: string }[] = [
  { value: "media_teaser", label: "Surprise Media Teaser", icon: "&#128248;" },
  { value: "timer_urgency", label: "Urgency Timer", icon: "&#9200;" },
  { value: "bundle_rail", label: "Bundle Rail", icon: "&#127916;" },
  { value: "discovery_circles", label: "Discovery Circles", icon: "&#128156;" },
  { value: "reward_progress", label: "Reward Progress", icon: "&#9889;" },
];

export default function PromotionEditor({
  promotion,
  personas,
  onSave,
  onCancel,
  saving = false,
}: Props) {
  const isNew = !promotion;
  const defaults = createDefaultPromotion("media_teaser");

  const [type, setType] = useState<PromotionType>(promotion?.type ?? "media_teaser");
  const [title, setTitle] = useState(promotion?.title ?? defaults.title);
  const [subtitle, setSubtitle] = useState(promotion?.subtitle ?? "");
  const [headline, setHeadline] = useState(promotion?.headline ?? defaults.headline);
  const [ctaText, setCtaText] = useState(promotion?.ctaText ?? defaults.ctaText);
  const [previewImageUrl, setPreviewImageUrl] = useState(promotion?.previewImageUrl ?? "");
  const [originalPrice, setOriginalPrice] = useState(promotion?.originalPrice ?? 9.99);
  const [promoPrice, setPromoPrice] = useState(promotion?.promoPrice ?? 4.99);
  const [timerDuration, setTimerDuration] = useState(promotion?.timerDurationMinutes ?? 30);
  const [bundleTitle, setBundleTitle] = useState(promotion?.bundleTitle ?? "");
  const [progressCopy, setProgressCopy] = useState(promotion?.progressCopy ?? "");
  const [nextRewardLabel, setNextRewardLabel] = useState(promotion?.nextRewardLabel ?? "");
  const [requiredActions, setRequiredActions] = useState(promotion?.requiredActions ?? 5);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>(promotion?.personaIds ?? []);
  const [showPreview, setShowPreview] = useState(false);
  // Preserve fields that exist on Promotion but have no UI editor yet
  const [description] = useState(promotion?.description ?? "");
  const [ctaAction] = useState(promotion?.ctaAction ?? "unlock");
  const [previewVideoUrl] = useState(promotion?.previewVideoUrl ?? "");
  const [bundleItems] = useState(promotion?.bundleItems ?? []);
  const [recommendedPersonaIds] = useState(promotion?.recommendedPersonaIds ?? []);
  const [status, setStatus] = useState(promotion?.status ?? "active");

  // Trigger rules
  const defaultRules = getDefaultTriggerRules(type);
  const [triggerRules, setTriggerRules] = useState<TriggerRules>(
    promotion?.triggerRules ?? defaultRules
  );

  function handleTypeChange(newType: PromotionType) {
    setType(newType);
    const newDefaults = createDefaultPromotion(newType);
    if (isNew) {
      setTitle(newDefaults.title);
      setCtaText(newDefaults.ctaText);
      setHeadline(newDefaults.headline);
      setTriggerRules(getDefaultTriggerRules(newType));
    }
  }

  function updateRule<K extends keyof TriggerRules>(key: K, value: TriggerRules[K]) {
    setTriggerRules((prev) => ({ ...prev, [key]: value }));
  }

  function togglePersona(id: string) {
    setSelectedPersonaIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function selectAllPersonas() {
    setSelectedPersonaIds(personas.map((p) => p.id));
  }

  function handleSave() {
    // Basic validation
    if (!title.trim()) return;
    if (type === "timer_urgency" && timerDuration <= 0) return;
    if (triggerRules.cooldownMinutes <= 0) return;
    if (type === "reward_progress" && requiredActions <= 0) return;

    onSave({
      type,
      title,
      subtitle,
      description,
      headline,
      ctaText,
      ctaAction,
      previewImageUrl: previewImageUrl || null,
      previewVideoUrl: previewVideoUrl || null,
      originalPrice,
      promoPrice,
      timerDurationMinutes: timerDuration,
      bundleTitle,
      bundleItems,
      recommendedPersonaIds,
      progressCopy,
      nextRewardLabel,
      requiredActions,
      personaIds: selectedPersonaIds,
      personaId: selectedPersonaIds[0] ?? null,
      triggerRules,
      status: status as "active" | "disabled" | "archived",
    });
  }

  const inputClass = "w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm";
  const labelClass = "text-white/60 text-xs font-medium mb-1.5 block";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          {isNew ? "Create Promotion" : "Edit Promotion"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors"
          >
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && (
        <div className="bg-[#0D0D1A] rounded-2xl p-4 border border-white/10">
          <p className="text-white/40 text-xs mb-3 text-center">Chat Preview</p>
          <div className="max-w-sm mx-auto">
            {type === "media_teaser" && (
              <MediaTeaserCard
                headline={headline || title}
                subtitle={subtitle}
                previewImageUrl={previewImageUrl || null}
                ctaText={ctaText}
                price={promoPrice ?? undefined}
                onUnlock={() => {}}
                onDismiss={() => {}}
              />
            )}
            {type === "timer_urgency" && (
              <TimerUrgencyCard
                title={title}
                subtitle={subtitle}
                originalPrice={originalPrice ?? 9.99}
                promoPrice={promoPrice ?? 4.99}
                durationMinutes={timerDuration}
                ctaText={ctaText}
                previewImageUrl={previewImageUrl || null}
                onClaim={() => {}}
                onDismiss={() => {}}
              />
            )}
            {type === "bundle_rail" && (
              <BundleRail
                title={bundleTitle || title}
                items={[
                  { id: "p1", title: "Preview item 1", thumbnailUrl: null, price: 1.99, imageCount: 3 },
                  { id: "p2", title: "Preview item 2", thumbnailUrl: null, price: 2.99, imageCount: 5, isBestValue: true },
                ]}
                onItemSelect={() => {}}
                onDismiss={() => {}}
              />
            )}
            {type === "reward_progress" && (
              <RewardProgressCard
                progressCopy={progressCopy || title}
                nextRewardLabel={nextRewardLabel || "Next reward"}
                currentProgress={0.6}
                stepsRemaining={requiredActions - 3}
                onDismiss={() => {}}
              />
            )}
            {type === "discovery_circles" && (
              <div className="text-center text-white/40 text-sm py-8">
                Discovery circles preview — shows story-style girl avatars
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column — content */}
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className={labelClass}>Promotion Type</label>
            <div className="grid grid-cols-1 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTypeChange(opt.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all text-sm ${
                    type === opt.value
                      ? "border-purple-500/50 bg-purple-500/10 text-white"
                      : "border-white/8 bg-[#1E1E30] text-white/60 hover:border-white/16"
                  }`}
                >
                  <span dangerouslySetInnerHTML={{ __html: opt.icon }} />
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelClass}>Title / Headline</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Only You Get To See Her Like This"
              className={inputClass}
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className={labelClass}>Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="A private moment, just for you"
              className={inputClass}
            />
          </div>

          {/* CTA Text */}
          <div>
            <label className={labelClass}>CTA Button Text</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Unlock Now"
              className={inputClass}
            />
          </div>

          {/* Headline (media teaser) */}
          {type === "media_teaser" && (
            <div>
              <label className={labelClass}>Card Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Only You Get To See Her Like This"
                className={inputClass}
              />
            </div>
          )}

          {/* Preview image */}
          {(type === "media_teaser" || type === "timer_urgency") && (
            <div>
              <label className={labelClass}>Preview Image URL</label>
              <input
                type="url"
                value={previewImageUrl}
                onChange={(e) => setPreviewImageUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          )}

          {/* Timer fields */}
          {type === "timer_urgency" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Original Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Promo Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Timer Duration (minutes)</label>
                <input
                  type="number"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Bundle fields */}
          {type === "bundle_rail" && (
            <div>
              <label className={labelClass}>Bundle Rail Title</label>
              <input
                type="text"
                value={bundleTitle}
                onChange={(e) => setBundleTitle(e.target.value)}
                placeholder="More from tonight"
                className={inputClass}
              />
            </div>
          )}

          {/* Reward progress fields */}
          {type === "reward_progress" && (
            <>
              <div>
                <label className={labelClass}>Progress Copy</label>
                <input
                  type="text"
                  value={progressCopy}
                  onChange={(e) => setProgressCopy(e.target.value)}
                  placeholder="2 more replies until she opens up more"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Next Reward Label</label>
                <input
                  type="text"
                  value={nextRewardLabel}
                  onChange={(e) => setNextRewardLabel(e.target.value)}
                  placeholder="Tonight's surprise"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Required Actions</label>
                <input
                  type="number"
                  value={requiredActions}
                  onChange={(e) => setRequiredActions(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Girl assignment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Assign to Girls</label>
              <button
                onClick={selectAllPersonas}
                className="text-purple-400 text-xs font-medium hover:text-purple-300 transition-colors"
              >
                Select all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePersona(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedPersonaIds.includes(p.id)
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "bg-white/5 text-white/40 border border-white/8 hover:border-white/16"
                  }`}
                >
                  {p.displayName}
                </button>
              ))}
              {personas.length === 0 && (
                <span className="text-white/30 text-xs">No personas available</span>
              )}
            </div>
          </div>
        </div>

        {/* Right column — trigger rules */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 15l-2 5l9-11h-5l2-5l-9 11h5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Trigger Rules
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Min Messages</label>
              <input
                type="number"
                value={triggerRules.minMessageExchanges}
                onChange={(e) => updateRule("minMessageExchanges", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tension Threshold</label>
              <input
                type="number"
                min={0}
                max={100}
                value={triggerRules.tensionThreshold}
                onChange={(e) => updateRule("tensionThreshold", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Weight (1-100)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={triggerRules.weight}
                onChange={(e) => updateRule("weight", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cooldown (min)</label>
              <input
                type="number"
                value={triggerRules.cooldownMinutes}
                onChange={(e) => updateRule("cooldownMinutes", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <input
                type="number"
                min={1}
                max={10}
                value={triggerRules.priority}
                onChange={(e) => updateRule("priority", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Max Per Session</label>
              <input
                type="number"
                min={1}
                value={triggerRules.maxPerSession}
                onChange={(e) => updateRule("maxPerSession", Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Tension band filter */}
          <div>
            <label className={labelClass}>Tension Band Filter (empty = all)</label>
            <div className="flex flex-wrap gap-2">
              {["warming_up", "image_zone", "premium_zone", "video_zone"].map((band) => (
                <button
                  key={band}
                  onClick={() => {
                    const current = triggerRules.tensionBandFilter;
                    updateRule(
                      "tensionBandFilter",
                      current.includes(band)
                        ? current.filter((b) => b !== band)
                        : [...current, band]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    triggerRules.tensionBandFilter.includes(band)
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "bg-white/5 text-white/40 border border-white/8 hover:border-white/16"
                  }`}
                >
                  {band.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Requires unlock history */}
          <div className="flex items-center justify-between p-3 bg-[#1E1E30] rounded-xl border border-white/8">
            <span className="text-white/60 text-sm">Requires prior unlock</span>
            <button
              onClick={() => updateRule("requiresUnlockHistory", !triggerRules.requiresUnlockHistory)}
              className={`w-10 h-6 rounded-full transition-all relative ${
                triggerRules.requiresUnlockHistory ? "bg-purple-500" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  triggerRules.requiresUnlockHistory ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/8">
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
          }}
        >
          {saving ? "Saving..." : isNew ? "Create Promotion" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
