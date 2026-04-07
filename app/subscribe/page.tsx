export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SubscriptionCard from "@/components/subscribe/SubscriptionCard";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function SubscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Profile | null };

  if (profile?.is_subscribed) redirect("/");

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0D0D1A] to-[#1a0a2e]">
      <div className="max-w-md mx-auto px-5 py-12">
        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight">
          Finally feel respected and loved
        </h1>

        {/* Start here label */}
        <p className="mt-4 text-center text-xs font-semibold tracking-[0.2em] uppercase text-purple-400">
          Start Here
        </p>

        {/* Price section */}
        <div className="mt-8 text-center">
          <span className="text-lg text-white/40 line-through mr-3">
            $9.99
          </span>
          <span
            className="text-6xl font-extrabold text-white"
            style={{
              textShadow:
                "0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2)",
            }}
          >
            $0.00
          </span>
          <p className="mt-2 text-sm text-white/50">for your first month</p>
        </div>

        {/* Value prop paragraph */}
        <p className="mt-8 text-center text-sm leading-relaxed text-white/60">
          Start 30 days of daily connection, deeper conversations, memory
          callbacks, story progression, and exclusive subscriber-only chats at no
          cost.
        </p>

        {/* Interactive card + CTA */}
        <div className="mt-8">
          <SubscriptionCard />
        </div>
      </div>
    </div>
  );
}
