export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import CreatorDashboardClient from "./CreatorDashboardClient";

export default async function CreatorDashboard() {
  const supabase = await createClient();
  const { data: personas } = await supabase
    .from("personas")
    .select("*")
    .order("sort_order");

  const { data: allMoments } = await supabase
    .from("moments")
    .select("persona_id");

  const momentCounts: Record<string, number> = {};
  (allMoments || []).forEach((m: { persona_id: string }) => {
    momentCounts[m.persona_id] = (momentCounts[m.persona_id] || 0) + 1;
  });

  return (
    <CreatorDashboardClient
      personas={personas || []}
      momentCounts={momentCounts}
    />
  );
}
