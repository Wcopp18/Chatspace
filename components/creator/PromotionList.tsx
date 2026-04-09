"use client";

import { useState, useEffect, useCallback } from "react";
import type { Promotion, PromotionType } from "@/types/promotions";

interface Props {
  onEdit: (promo: Promotion) => void;
  onCreate: () => void;
  refreshKey?: number;
}

const TYPE_ICONS: Record<PromotionType, string> = {
  media_teaser: "&#128248;",
  timer_urgency: "&#9200;",
  bundle_rail: "&#127916;",
  discovery_circles: "&#128156;",
  reward_progress: "&#9889;",
};

const TYPE_LABELS: Record<PromotionType, string> = {
  media_teaser: "Media Teaser",
  timer_urgency: "Urgency Timer",
  bundle_rail: "Bundle Rail",
  discovery_circles: "Discovery Circles",
  reward_progress: "Reward Progress",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-400/15 text-green-400",
  disabled: "bg-white/10 text-white/40",
  archived: "bg-red-400/15 text-red-400",
};

export default function PromotionList({ onEdit, onCreate, refreshKey }: Props) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | PromotionType>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promotions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.promotions) setPromotions(data.promotions);
    } catch (err) {
      console.error("Fetch promotions error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions, refreshKey]);

  async function handleAction(action: string, promotionId: string) {
    setActionLoading(promotionId);
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, promotionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.promotions) setPromotions(data.promotions);
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = filter === "all"
    ? promotions.filter((p) => p.status !== "archived")
    : promotions.filter((p) => p.type === filter && p.status !== "archived");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Promotions</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {promotions.length} promotion{promotions.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
            boxShadow: "0 0 15px rgba(139, 92, 246, 0.25)",
          }}
        >
          + Create
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { value: "all", label: "All" },
          ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === tab.value
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-white/5 text-white/40 border border-white/8 hover:border-white/16"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Promotion cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl opacity-30">&#128640;</span>
          </div>
          <p className="text-white/40 text-sm">No promotions yet</p>
          <button
            onClick={onCreate}
            className="mt-3 text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors"
          >
            Create your first promotion
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((promo) => (
            <div
              key={promo.id}
              className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4 hover:border-white/16 transition-all group"
            >
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <span
                    className="text-lg"
                    dangerouslySetInnerHTML={{ __html: TYPE_ICONS[promo.type] }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-semibold text-sm truncate">{promo.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[promo.status]}`}>
                      {promo.status}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs">{TYPE_LABELS[promo.type]}</p>

                  {/* Trigger summary */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-white/20 text-[10px]">
                      {promo.triggerRules.minMessageExchanges}+ msgs
                    </span>
                    <span className="text-white/20 text-[10px]">
                      tension {promo.triggerRules.tensionThreshold}+
                    </span>
                    <span className="text-white/20 text-[10px]">
                      weight {promo.triggerRules.weight}
                    </span>
                    <span className="text-white/20 text-[10px]">
                      {promo.triggerRules.cooldownMinutes}m cd
                    </span>
                    {promo.promoPrice != null && (
                      <span className="text-green-400/60 text-[10px] font-medium">
                        ${promo.promoPrice}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => onEdit(promo)}
                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="Edit"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleAction("duplicate", promo.id)}
                    disabled={actionLoading === promo.id}
                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="Duplicate"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleAction("toggle", promo.id)}
                    disabled={actionLoading === promo.id}
                    className={`p-2 rounded-lg transition-all ${
                      promo.status === "active"
                        ? "text-green-400/60 hover:text-green-400 hover:bg-green-400/10"
                        : "text-white/40 hover:text-white hover:bg-white/10"
                    }`}
                    title={promo.status === "active" ? "Disable" : "Enable"}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {promo.status === "active" ? (
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z" />
                      ) : (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      )}
                    </svg>
                  </button>
                  <button
                    onClick={() => handleAction("archive", promo.id)}
                    disabled={actionLoading === promo.id}
                    className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Archive"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
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
