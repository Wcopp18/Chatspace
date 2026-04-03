import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { buildContextualPrompt } from "@/lib/ai/persona-engine";
import { calculateEmotionScore, shouldTriggerContinuation } from "@/lib/utils";
import type { PersonaContext, AIMessage } from "@/lib/ai/types";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Phrase = Database["public"]["Tables"]["persona_phrase_bank"]["Row"];
type Memory = { memory_key: string; memory_value: string };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { personaSlug, message, conversationId } = body;

    if (!personaSlug || !message) {
      return NextResponse.json({ error: "Missing personaSlug or message" }, { status: 400 });
    }

    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .select("*")
      .eq("slug", personaSlug)
      .eq("is_active", true)
      .single() as { data: Persona | null; error: unknown };

    if (personaError || !persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    let convId = conversationId;
    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, persona_id: persona.id })
        .select()
        .single() as { data: Conversation | null; error: unknown };

      if (convError || !conv) {
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }
      convId = conv.id;
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", convId)
      .single() as { data: Conversation | null };

    const { data: messageHistory } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(30);

    const { data: phrases } = await supabase
      .from("persona_phrase_bank")
      .select("*")
      .eq("persona_id", persona.id)
      .eq("is_active", true) as { data: Phrase[] | null };

    const signaturePhrases = (phrases || []).filter(p => p.phrase_type === "signature").map(p => p.phrase);
    const petNames = (phrases || []).filter(p => p.phrase_type === "pet_name").map(p => p.phrase);
    const teaserLines = (phrases || []).filter(p => p.phrase_type === "teaser").map(p => p.phrase);
    const introLines = (phrases || []).filter(p => p.phrase_type === "intro").map(p => p.phrase);
    const upsellPhrases = (phrases || []).filter(p => p.phrase_type === "upsell").map(p => p.phrase);

    const { data: memories } = await supabase
      .from("persona_memories")
      .select("memory_key, memory_value")
      .eq("persona_id", persona.id)
      .eq("user_id", user.id) as { data: Memory[] | null };

    const personaCtx: PersonaContext = {
      personaId: persona.id,
      displayName: persona.display_name,
      bio: persona.bio || "",
      warmth: persona.warmth,
      teaseLevel: persona.tease_level,
      textingStyle: persona.texting_style,
      emojiStyle: persona.emoji_style,
      sentenceLength: persona.sentence_length,
      signaturePhrases,
      petNames,
      teaserLines,
      introLines,
      approvedUpsellPhrases: upsellPhrases,
      memories: (memories || []).map(m => ({ key: m.memory_key, value: m.memory_value })),
    };

    const aiMessages: AIMessage[] = (messageHistory || []).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    aiMessages.push({ role: "user", content: message });

    const systemPrompt = buildContextualPrompt(personaCtx, aiMessages, message);

    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    const ai = getAIProvider("claude");
    const aiResponse = await ai.chat({
      messages: aiMessages,
      systemPrompt,
      maxTokens: 250,
      temperature: 0.85,
    });

    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: aiResponse,
    });

    const allMessages = [...aiMessages, { role: "assistant" as const, content: aiResponse }];
    const emotionScore = calculateEmotionScore(allMessages);
    const newMessageCount = (conversation?.message_count || 0) + 2;

    const lastContinuationAt = conversation?.last_continuation_at
      ? new Date(conversation.last_continuation_at)
      : null;

    const triggerContinuation = shouldTriggerContinuation(
      newMessageCount,
      emotionScore,
      lastContinuationAt,
      persona.continuation_frequency || 30
    );

    let continuationPrompt = null;
    if (triggerContinuation) {
      const { data: contPrompts } = await supabase
        .from("continuation_prompts")
        .select("*")
        .eq("persona_id", persona.id)
        .eq("is_active", true)
        .limit(3);

      if (contPrompts && contPrompts.length > 0) {
        continuationPrompt = contPrompts[Math.floor(Math.random() * contPrompts.length)];
      }
    }

    await supabase
      .from("conversations")
      .update({
        message_count: newMessageCount,
        emotion_score: emotionScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convId);

    return NextResponse.json({
      message: aiResponse,
      conversationId: convId,
      emotionScore,
      continuationPrompt: continuationPrompt ? {
        id: continuationPrompt.id,
        line: continuationPrompt.continuation_line,
        cta: continuationPrompt.popup_cta,
        price: continuationPrompt.price,
      } : null,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
