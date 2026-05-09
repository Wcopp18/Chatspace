/**
 * Bundle Engine
 *
 * Surfaces a multi-photo bundle when:
 *   • The user has unlocked at least one moment recently (positive reaction)
 *   • The OH_WAIT_THERES_MORE category is eligible to fire
 *   • Per-bundle thresholds (min messages, momentum, cooldown, max-per-day) pass
 *
 * Returns null on most turns. The UI shows a BundleCard when this fires.
 * Non-throwing — chat route continues silently if anything fails.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface BundleSelection {
  id: string;
  title: string;
  introLine: string;          // paraphrase guidance for the AI
  introMode: "exact" | "paraphrase" | "ai_generate";
  price: number;
  itemCount: number;
  rarityTier: string;
  thumbnailUrl: string | null;
}

export interface BundleEvalInput {
  supabase: SupabaseClient;
  userId: string;
  personaId: string;
  conversationMessageCount: number;
  emotionalMomentumScore: number;
  hasRecentPositiveUnlock: boolean;
}

export async function selectBundleForInjection(
  input: BundleEvalInput,
): Promise<BundleSelection | null> {
  try {
    // Load active bundles for this persona
    const { data: bundles } = await input.supabase
      .from("moment_bundles")
      .select("*")
      .eq("persona_id", input.personaId)
      .eq("is_active", true)
      .order("sort_order");

    if (!bundles || bundles.length === 0) return null;

    // Today's user unlocks (cap)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todays } = await input.supabase
      .from("moment_bundle_unlocks")
      .select("bundle_id, created_at")
      .eq("user_id", input.userId)
      .gte("created_at", todayStart.toISOString());

    const todayCountByBundle = new Map<string, number>();
    for (const u of (todays || []) as { bundle_id: string }[]) {
      todayCountByBundle.set(u.bundle_id, (todayCountByBundle.get(u.bundle_id) || 0) + 1);
    }

    // Recent unlock for cooldown
    const recentMs = todays && todays.length > 0
      ? new Date((todays[0] as { created_at: string }).created_at).getTime()
      : 0;
    const sinceMs = Date.now() - recentMs;

    // Filter eligible
    const eligible = bundles.filter((b) => {
      if (input.conversationMessageCount < (b.min_messages ?? 0)) return false;
      if (input.emotionalMomentumScore < (b.min_momentum_score ?? 0)) return false;
      if (b.requires_prior_unlock && !input.hasRecentPositiveUnlock) return false;
      if (sinceMs < (b.cooldown_seconds ?? 0) * 1000) return false;
      if ((todayCountByBundle.get(b.id) || 0) >= (b.max_per_day ?? 1)) return false;
      return true;
    });

    if (eligible.length === 0) return null;

    const chosen = eligible[Math.floor(Math.random() * eligible.length)];

    // Get count of items + a thumbnail
    const { data: items } = await input.supabase
      .from("moment_bundle_items")
      .select("moment_id, sort_order, moments(thumbnail_url)")
      .eq("bundle_id", chosen.id)
      .order("sort_order")
      .limit(10);

    const itemRows = (items || []) as Array<{
      moment_id: string;
      sort_order: number;
      moments: { thumbnail_url: string | null } | { thumbnail_url: string | null }[] | null;
    }>;
    const firstThumb = itemRows.length > 0
      ? (Array.isArray(itemRows[0].moments)
          ? itemRows[0].moments[0]?.thumbnail_url ?? null
          : itemRows[0].moments?.thumbnail_url ?? null)
      : null;

    return {
      id: chosen.id,
      title: chosen.title,
      introLine: chosen.intro_line || "",
      introMode: (chosen.intro_mode as BundleSelection["introMode"]) || "paraphrase",
      price: Number(chosen.price),
      itemCount: itemRows.length,
      rarityTier: chosen.rarity_tier || "standard",
      thumbnailUrl: firstThumb,
    };
  } catch (e) {
    console.error("Bundle selection error:", e);
    return null;
  }
}

/**
 * Check whether the user has unlocked at least one moment with this persona
 * in the last N minutes (positive-reaction proxy).
 */
export async function hasRecentPositiveUnlock(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
  withinMinutes = 30,
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
    const { data } = await supabase
      .from("moment_unlocks")
      .select("id, moment_id, moments!inner(persona_id)")
      .eq("user_id", userId)
      .gte("created_at", since)
      .limit(5);
    if (!data) return false;
    return (data as Array<{ moments: { persona_id: string } | { persona_id: string }[] }>).some(
      (row) => {
        const m = row.moments;
        if (!m) return false;
        if (Array.isArray(m)) return m.some((mm) => mm.persona_id === personaId);
        return m.persona_id === personaId;
      },
    );
  } catch {
    return false;
  }
}
