export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import LevelsEditor, { type LevelRow, type RewardRow } from "@/components/creator/LevelsEditor";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CreatorLevelsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!persona) notFound();

  const admin = createAdminClient();
  const { data: levels } = await admin
    .from("relationship_levels")
    .select("*")
    .eq("persona_id", persona.id)
    .eq("is_active", true)
    .order("level_number", { ascending: true });

  const levelIds = (levels || []).map((l: { id: string }) => l.id);
  const { data: rewardsRaw } = levelIds.length > 0
    ? await admin
        .from("relationship_level_rewards")
        .select("*")
        .in("level_id", levelIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    : { data: [] };

  // Generate preview signed URLs for images
  const rewards: RewardRow[] = [];
  for (const r of (rewardsRaw || []) as RewardRow[]) {
    let preview_url: string | null = null;
    if (r.media_url && !r.media_url.startsWith("http")) {
      const { data: signed } = await admin.storage
        .from("level-rewards")
        .createSignedUrl(r.media_url, 60 * 60);
      preview_url = signed?.signedUrl || null;
    }
    rewards.push({ ...r, preview_url });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <Link href={`/creator/${persona.slug}`} className="text-white/40 hover:text-white">
          ← Back to {persona.display_name}
        </Link>
      </div>
      <LevelsEditor
        personaId={persona.id}
        personaName={persona.display_name}
        initialLevels={(levels || []) as LevelRow[]}
        initialRewards={rewards}
      />
    </div>
  );
}
