/**
 * Free-tier message quota check.
 *
 * Counts user-authored messages since midnight UTC today across all of
 * the user's conversations. Subscribed users bypass the cap.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONVERSATION_LIMITS } from "@/lib/constants";

export async function countUserMessagesToday(supabase: SupabaseClient, userId: string): Promise<number> {
  const startOfDayIso = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();

  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId);
  const convIds = ((convs as { id: string }[] | null) ?? []).map((c) => c.id);
  if (convIds.length === 0) return 0;

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .eq("role", "user")
    .gte("created_at", startOfDayIso);

  return count ?? 0;
}

export interface FreeLimitResult {
  over: boolean;
  count: number;
  limit: number;
}

export async function isOverFreeLimit(
  supabase: SupabaseClient,
  userId: string,
  isSubscribed: boolean,
): Promise<FreeLimitResult> {
  const limit = CONVERSATION_LIMITS.FREE_MESSAGES;
  if (isSubscribed) return { over: false, count: 0, limit };
  const count = await countUserMessagesToday(supabase, userId);
  return { over: count >= limit, count, limit };
}
