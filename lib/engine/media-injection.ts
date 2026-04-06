/**
 * Premium Media Injection Engine
 *
 * Selects the right moment to inject based on:
 * - tension band thresholds
 * - tag matching with conversation mood
 * - unseen-only filtering
 * - rarity rules
 * - persona matching
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TensionBand } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

// Moment type matching DB schema
interface Moment {
  id: string;
  persona_id: string;
  title: string;
  tease_copy: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  price: number;
  rarity_tier: string;
  min_tension_score: number;
  mood_tags: string[];
  vault_event_id: string | null;
  is_active: boolean;
  tags: string[];
  story_arc_id: string | null;
  is_custom_delivery: boolean;
  delivered_count: number;
  expires_at: string | null;
  lock_state: string;
  auto_move_to_sidebar: boolean;
  sidebar_delay_minutes: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InjectionCandidate {
  moment: Moment;
  teaserLine: string;
}

// Maps tension bands to eligible media types
const BAND_MEDIA_ELIGIBILITY: Record<TensionBand, string[]> = {
  warming_up: [],
  image_zone: ["image"],
  premium_zone: ["image"],  // Premium/rare images
  video_zone: ["image", "video"],
};

// Rarity tiers and their probability of selection
const RARITY_WEIGHTS: Record<string, number> = {
  common: 1.0,
  rare: 0.6,
  ultra_rare: 0.25,
  exclusive: 0.1,
};

/**
 * Select a premium moment to inject into the chat
 *
 * Returns null if no suitable moment is available
 */
export async function selectMomentForInjection(
  supabase: SupabaseAny,
  params: {
    userId: string;
    personaId: string;
    tensionBand: TensionBand;
    tensionScore: number;
    moodTag: string | null;
    conversationId: string;
  },
): Promise<InjectionCandidate | null> {
  const eligibleMediaTypes = BAND_MEDIA_ELIGIBILITY[params.tensionBand];
  if (eligibleMediaTypes.length === 0) return null;

  // Get all active moments for this persona
  const { data: allMoments } = await supabase
    .from("moments")
    .select("*")
    .eq("persona_id", params.personaId)
    .eq("is_active", true)
    .in("media_type", eligibleMediaTypes)
    .lte("min_tension_score", params.tensionScore);

  if (!allMoments || allMoments.length === 0) return null;

  // Filter by rarity for premium_zone (only rare+ in premium zone)
  let candidates = allMoments;
  if (params.tensionBand === "premium_zone") {
    candidates = candidates.filter(m =>
      m.rarity_tier !== "common"
    );
    // If no rare+ moments, fall back to common
    if (candidates.length === 0) candidates = allMoments;
  }

  // Get user's delivery history — exclude already-seen moments
  const { data: delivered } = await supabase
    .from("media_delivery_history")
    .select("moment_id")
    .eq("user_id", params.userId)
    .eq("persona_id", params.personaId);

  const deliveredIds = new Set((delivered || []).map(d => d.moment_id));

  // Filter to unseen only
  let unseenCandidates = candidates.filter(m => !deliveredIds.has(m.id));

  // If all have been seen, allow re-delivery (full library exhaustion)
  if (unseenCandidates.length === 0) {
    unseenCandidates = candidates;
  }

  // Mood tag matching (boost relevance)
  if (params.moodTag) {
    const moodMatched = unseenCandidates.filter(m =>
      m.mood_tags.includes(params.moodTag!)
    );
    if (moodMatched.length > 0) {
      unseenCandidates = moodMatched;
    }
  }

  // Check for active vault events
  const now = new Date().toISOString();
  const { data: activeVaults } = await supabase
    .from("vault_events")
    .select("id")
    .eq("persona_id", params.personaId)
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now);

  // Boost vault-linked moments
  if (activeVaults && activeVaults.length > 0) {
    const vaultIds = new Set(activeVaults.map(v => v.id));
    const vaultMoments = unseenCandidates.filter(m =>
      m.vault_event_id && vaultIds.has(m.vault_event_id)
    );
    if (vaultMoments.length > 0) {
      unseenCandidates = vaultMoments;
    }
  }

  // Weighted random selection by rarity
  const weighted = unseenCandidates.map(m => ({
    moment: m,
    weight: RARITY_WEIGHTS[m.rarity_tier] || 1.0,
  }));

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { moment, weight } of weighted) {
    random -= weight;
    if (random <= 0) {
      // Record delivery
      await recordDelivery(supabase, params.userId, params.personaId, moment.id);

      return {
        moment,
        teaserLine: moment.tease_copy,
      };
    }
  }

  // Fallback
  const fallback = unseenCandidates[0];
  await recordDelivery(supabase, params.userId, params.personaId, fallback.id);

  return {
    moment: fallback,
    teaserLine: fallback.tease_copy,
  };
}

/**
 * Record that a moment was delivered to a user
 */
async function recordDelivery(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  momentId: string,
): Promise<void> {
  await supabase.from("media_delivery_history").upsert(
    {
      user_id: userId,
      persona_id: personaId,
      moment_id: momentId,
    },
    { onConflict: "user_id,moment_id" }
  );
}

/**
 * Get user's media delivery stats for a persona
 */
export async function getMediaDeliveryStats(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<{
  totalDelivered: number;
  totalUnlocked: number;
  totalAvailable: number;
  exhaustionRate: number;
}> {
  const [deliveryResult, totalResult] = await Promise.all([
    supabase
      .from("media_delivery_history")
      .select("id, was_unlocked")
      .eq("user_id", userId)
      .eq("persona_id", personaId),
    supabase
      .from("moments")
      .select("id")
      .eq("persona_id", personaId)
      .eq("is_active", true),
  ]);

  const delivered = deliveryResult.data || [];
  const total = totalResult.data || [];

  return {
    totalDelivered: delivered.length,
    totalUnlocked: delivered.filter(d => d.was_unlocked).length,
    totalAvailable: total.length,
    exhaustionRate: total.length > 0 ? delivered.length / total.length : 0,
  };
}
