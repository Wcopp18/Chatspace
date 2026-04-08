"use client";

import { useState, useEffect } from "react";
import PromotionList from "@/components/creator/PromotionList";
import PromotionEditor from "@/components/creator/PromotionEditor";
import type { Promotion } from "@/types/promotions";

interface PersonaOption {
  id: string;
  displayName: string;
  slug: string;
}

export default function PromotionsPage() {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Fetch personas for assignment
    fetch("/api/creator/moments")
      .then((r) => r.json())
      .then((data) => {
        if (data.personas) {
          setPersonas(
            data.personas.map((p: { id: string; display_name: string; slug: string }) => ({
              id: p.id,
              displayName: p.display_name,
              slug: p.slug,
            }))
          );
        }
      })
      .catch(console.error);
  }, []);

  async function handleSave(data: Partial<Promotion>) {
    setSaving(true);
    try {
      const action = editingPromo?.id ? "update" : "create";
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          promotion: data,
          promotionId: editingPromo?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setView("list");
      setEditingPromo(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  if (view === "create" || view === "edit") {
    return (
      <PromotionEditor
        promotion={editingPromo}
        personas={personas}
        onSave={handleSave}
        onCancel={() => {
          setView("list");
          setEditingPromo(null);
        }}
        saving={saving}
      />
    );
  }

  return (
    <PromotionList
      onEdit={(promo) => {
        setEditingPromo(promo);
        setView("edit");
      }}
      onCreate={() => {
        setEditingPromo(null);
        setView("create");
      }}
      refreshKey={refreshKey}
    />
  );
}
