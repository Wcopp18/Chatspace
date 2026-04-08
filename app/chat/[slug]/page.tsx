export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ChatShell from "@/components/chat/ChatShell";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Allow unauthenticated users to view chat (deep-link entry)
  // Auth happens in-chat via AuthModal
  const isAuthenticated = !!user;

  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!persona) notFound();

  // Load data only if authenticated
  let conversation: any = null;
  let messages: any[] = [];
  let moments: any[] = [];

  if (user) {
    // Get most recent conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("persona_id", persona.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    conversation = conv;

    // Load message history if conversation exists
    if (conversation) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(50);
      messages = msgs || [];
    }

    // Load active moments for this persona
    const { data: momentData } = await supabase
      .from("moments")
      .select("*")
      .eq("persona_id", persona.id)
      .eq("is_active", true)
      .order("sort_order");

    moments = momentData || [];

    // Check which moments this user has unlocked
    const momentIds = moments.map((m: any) => m.id);
    if (momentIds.length > 0) {
      const { data: unlocks } = await supabase
        .from("moment_unlocks")
        .select("moment_id")
        .eq("user_id", user.id)
        .in("moment_id", momentIds);

      const unlockedIds = new Set((unlocks || []).map((u: any) => u.moment_id));
      moments = moments.map((m: any) => ({ ...m, unlocked: unlockedIds.has(m.id) }));
    } else {
      moments = moments.map((m: any) => ({ ...m, unlocked: false }));
    }
  }

  return (
    <ChatShell
      persona={persona}
      userId={user?.id ?? null}
      initialMessages={messages}
      initialConversationId={conversation?.id || null}
      moments={moments}
      isAuthenticated={isAuthenticated}
    />
  );
}
