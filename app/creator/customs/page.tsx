export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import CustomsQueueClient from "./CustomsQueueClient";

export default async function CustomsQueuePage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("custom_requests")
    .select("*, personas(display_name, slug, avatar_url), profiles!custom_requests_user_id_fkey(username, display_name)")
    .order("submitted_at", { ascending: false })
    .limit(100);

  const { data: personas } = await supabase
    .from("personas")
    .select("id, display_name, slug")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/creator" className="text-white/40 hover:text-white text-sm">← All Girls</a>
        <span className="text-white/20">/</span>
        <span className="text-white font-semibold">Custom Requests Queue</span>
      </div>

      <CustomsQueueClient
        initialRequests={requests || []}
        personas={personas || []}
      />
    </div>
  );
}
