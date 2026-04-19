export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ChatShell from "@/components/chat/ChatShell";
import { getRelationshipSnapshot } from "@/lib/engine";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!persona) notFound();

  // Get most recent conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .eq("persona_id", persona.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Load message history if conversation exists
  const { data: messages } = conversation
    ? await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(50)
    : { data: [] };

  // Load active moments for this persona
  const { data: moments } = await supabase
    .from("moments")
    .select("*")
    .eq("persona_id", persona.id)
    .eq("is_active", true)
    .order("sort_order");

  // Check which moments this user has unlocked
  const momentIds = (moments || []).map((m) => m.id);
  const { data: unlocks } = momentIds.length > 0
    ? await supabase
        .from("moment_unlocks")
        .select("moment_id")
        .eq("user_id", user.id)
        .in("moment_id", momentIds)
    : { data: [] };

  const unlockedIds = new Set((unlocks || []).map((u) => u.moment_id));

  const relationshipSnapshot = await getRelationshipSnapshot(supabase, user.id, persona.id).catch(() => null);

  return (
    <ChatShell
      persona={persona}
      userId={user.id}
      initialMessages={messages || []}
      initialConversationId={conversation?.id || null}
      moments={(moments || []).map((m) => ({
        ...m,
        unlocked: unlockedIds.has(m.id),
      }))}
      initialRelationship={relationshipSnapshot}
    />
  );
}
