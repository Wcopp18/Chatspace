"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PromotionList from "@/components/creator/PromotionList";
import PromotionEditor from "@/components/creator/PromotionEditor";
import type { Promotion } from "@/types/promotions";

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

interface Persona {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  warmth: number;
  tease_level: number;
}

type Tab = "girls" | "promotions";

interface Props {
  personas: Persona[];
  momentCounts: Record<string, number>;
}

export default function CreatorDashboardClient({ personas, momentCounts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("girls");
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [promoRefreshKey, setPromoRefreshKey] = useState(0);

  async function handleSavePromotion(promo: Partial<Promotion>) {
    const isNew = !promo.id;
    const method = isNew ? "POST" : "PUT";
    const res = await fetch("/api/promotions", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promo),
    });
    if (res.ok) {
      setPromoRefreshKey((k) => k + 1);
      setShowEditor(false);
      setEditingPromo(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-[#1E1E30] rounded-xl p-1 border border-white/5">
        {(["girls", "promotions"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-[#FF3CAC] to-[#8B5CF6] text-white shadow-lg"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab === "girls" ? "Girls" : "Promotions"}
          </button>
        ))}
      </div>

      {/* Girls Tab */}
      {activeTab === "girls" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-white">Girls</h1>
            <p className="text-white/40 text-sm mt-1">Manage personas, moments, and pricing</p>
          </div>
          <div className="grid gap-4">
            {personas.map((persona) => {
              const avatar = persona.avatar_url || PLACEHOLDER_AVATARS[persona.slug] || PLACEHOLDER_AVATARS["luna"];
              return (
                <Link
                  key={persona.id}
                  href={`/creator/${persona.slug}`}
                  className="group flex items-center gap-4 bg-[#1E1E30] border border-white/8 rounded-2xl p-4 hover:border-white/16 transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-[#FF3CAC]/20">
                    <Image src={avatar} alt={persona.display_name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{persona.display_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${persona.is_active ? "bg-green-400/15 text-green-400" : "bg-white/10 text-white/40"}`}>
                        {persona.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>
                    <p className="text-white/40 text-sm mt-0.5 truncate">{persona.bio}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-white/30 text-xs">Warmth {persona.warmth}/10</span>
                      <span className="text-white/30 text-xs">Tease {persona.tease_level}/10</span>
                      <span className="text-white/30 text-xs">{momentCounts[persona.id] || 0} moments</span>
                    </div>
                  </div>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Promotions Tab */}
      {activeTab === "promotions" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Promotions</h1>
              <p className="text-white/40 text-sm mt-1">Create and manage in-chat premium events</p>
            </div>
            <button
              onClick={() => { setEditingPromo(null); setShowEditor(true); }}
              className="gradient-bg text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              + New Promotion
            </button>
          </div>

          {showEditor ? (
            <PromotionEditor
              promotion={editingPromo}
              personas={personas.map(p => ({ id: p.id, displayName: p.display_name, slug: p.slug }))}
              onSave={handleSavePromotion}
              onCancel={() => { setShowEditor(false); setEditingPromo(null); }}
            />
          ) : (
            <PromotionList
              onEdit={(promo) => { setEditingPromo(promo); setShowEditor(true); }}
              onCreate={() => { setEditingPromo(null); setShowEditor(true); }}
              refreshKey={promoRefreshKey}
            />
          )}
        </>
      )}
    </div>
  );
}
