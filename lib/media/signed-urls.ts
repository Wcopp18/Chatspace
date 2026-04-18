/**
 * Signed URL helper for paid media.
 *
 * New uploads store the storage *path* in `moments.media_url` and
 * `relationship_level_rewards.media_url`. Legacy rows may contain a
 * full long-expiry signed URL — for backward compat we pass those
 * through unchanged. Fresh signatures are 60 seconds.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SIGNED_TTL_SECONDS = 60;

export function isLegacyFullUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export async function signStoragePath(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn: number = DEFAULT_SIGNED_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function resolveMediaUrl(
  supabase: SupabaseClient,
  bucket: string,
  storedValue: string | null,
  expiresIn: number = DEFAULT_SIGNED_TTL_SECONDS,
): Promise<string | null> {
  if (!storedValue) return null;
  if (isLegacyFullUrl(storedValue)) return storedValue;
  return signStoragePath(supabase, bucket, storedValue, expiresIn);
}
