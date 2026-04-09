import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { buildContextualPrompt } from "@/lib/ai/persona-engine";
import { calculateEmotionScore, shouldTriggerContinuation } from "@/lib/utils";
import {
  routeResponse,
  recordResponseUsage,
  logRoutingDecision,
  analyzeMessage,
  updateTension,
  getTensionBand,
  selectMomentForInjection,
  extractMemories,
  saveMemories,
  selectCallback,
} from "@/lib/engine";
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

    const currentMessageCount = conversation?.message_count || 0;

    // ── STEP 1: Extract and save memories (non-blocking, safe) ──
    try {
      const extractedMemories = extractMemories(message);
      if (extractedMemories.length > 0) {
        saveMemories(supabase, user.id, persona.id, extractedMemories).catch(e => console.error("Memory save error:", e));
      }
    } catch (e) { console.error("Memory extract error:", e); }

    // ── STEP 2: Generate AI response (always works — this is the core) ──
    let aiResponse: string;
    let responseSource = "claude";

    // Try routing engine, fall back to direct Claude if it fails
    try {
      const currentTensionScore = Number(conversation?.current_tension_score || 0);
      const currentBand = getTensionBand(currentTensionScore);

      const routingDecision = await routeResponse(supabase, {
        userId: user.id,
        personaId: persona.id,
        conversationId: convId,
        userMessage: message,
        messageHistory: aiMessages,
        tensionScore: currentTensionScore,
        tensionBand: currentBand,
        messageCount: currentMessageCount,
      });

      if (routingDecision.route === "prewritten" && routingDecision.prewrittenResponse) {
        aiResponse = routingDecision.prewrittenResponse.content;
        responseSource = "prewritten";
        recordResponseUsage(supabase, user.id, persona.id, routingDecision.prewrittenResponse.id, routingDecision.prewrittenResponse.semanticGroup).catch(console.error);
      } else {
        // Claude fallback with optional memory callback
        let fullPrompt = buildContextualPrompt(personaCtx, aiMessages, message);
        try {
          const callbackLine = await selectCallback(supabase, user.id, persona.id, currentMessageCount);
          if (callbackLine) fullPrompt += `\n\n[CALLBACK OPPORTUNITY: Consider naturally weaving in this memory reference: "${callbackLine}"]`;
        } catch (e) { console.error("Callback error:", e); }

        const ai = getAIProvider("claude");
        aiResponse = await ai.chat({ messages: aiMessages, systemPrompt: fullPrompt, maxTokens: 250, temperature: 0.85 });
      }

      // Log routing decision (non-blocking)
      logRoutingDecision(supabase, convId, message, routingDecision, currentTensionScore, aiResponse).catch(console.error);
    } catch (routingError) {
      console.error("Routing engine error, falling back to Claude:", routingError);
      const systemPrompt = buildContextualPrompt(personaCtx, aiMessages, message);
      const ai = getAIProvider("claude");
      aiResponse = await ai.chat({ messages: aiMessages, systemPrompt, maxTokens: 250, temperature: 0.85 });
    }

    // ── STEP 3: Save messages ──
    await supabase.from("messages").insert({ conversation_id: convId, role: "user", content: message });
    await supabase.from("messages").insert({ conversation_id: convId, role: "assistant", content: aiResponse, source: responseSource });

    // ── STEP 4: Update tension (v2 — two-layer system, safe) ──
    let tensionResult: { newScore: number; newBand: string; delta: number; previousBand: string; rewardTriggered: boolean; previousScore: number; revealProbability: number; phrase?: { phrase: string | null; type: string | null } | null } = { newScore: 18, newBand: "warming_up", delta: 0, previousBand: "warming_up", rewardTriggered: false, previousScore: 18, revealProbability: 0, phrase: null };
    try {
      const lastMessageTime = messageHistory && messageHistory.length > 0
        ? new Date(messageHistory[messageHistory.length - 1].created_at).getTime()
        : Date.now();
      const responseSpeedSeconds = (Date.now() - lastMessageTime) / 1000;

      const analysis = analyzeMessage(message);
      tensionResult = await updateTension(supabase, user.id, persona.id, convId, {
        ...analysis,
        responseSpeedSeconds,
        justUnlockedReward: false,
      });
    } catch (e) { console.error("Tension update error:", e); }

    // ── STEP 5: Check for premium moment injection (safe) ──
    let injectedMoment = null;
    try {
      if (tensionResult.rewardTriggered) {
        const candidate = await selectMomentForInjection(supabase, {
          userId: user.id, personaId: persona.id, tensionBand: tensionResult.newBand as "warming_up" | "image_zone" | "premium_zone" | "video_zone",
          tensionScore: tensionResult.newScore, moodTag: null, conversationId: convId,
        });
        if (candidate) {
          injectedMoment = {
            id: candidate.moment.id, title: candidate.moment.title,
            teaseCopy: candidate.teaserLine, mediaType: candidate.moment.media_type,
            price: candidate.moment.price, thumbnailUrl: candidate.moment.thumbnail_url,
            rarityTier: candidate.moment.rarity_tier,
          };
        }
      }
    } catch (e) { console.error("Moment injection error:", e); }

    // ── STEP 5b: Detect custom request intent ──
    const customRequestPatterns = [
      /custom\s*(vid|video|image|photo|pic|content)/i,
      /make\s*(me\s*)?(a\s*)?(vid|video|image|photo)/i,
      /request\s*(a\s*)?(vid|video|image|photo|custom|form)/i,
      /can\s*you\s*(make|create|film|shoot|do)/i,
      /i\s*want\s*(a\s*)?(custom|personal|special)\s*(vid|video|image|photo)/i,
      /cust\w*\s*vid/i,
      /video\s*request/i,
      /image\s*request/i,
      /request\s*form/i,
      /fill\s*out.*form/i,
    ];
    const showCustomRequestCard = customRequestPatterns.some(p => p.test(message));

    // ── STEP 6: Calculate emotion and check continuation (safe) ──
    const allMessages = [...aiMessages, { role: "assistant" as const, content: aiResponse }];
    const emotionScore = calculateEmotionScore(allMessages);
    const newMessageCount = currentMessageCount + 2;

    let continuationPrompt = null;
    try {
      const lastContinuationAt = conversation?.last_continuation_at ? new Date(conversation.last_continuation_at) : null;
      const triggerContinuation = shouldTriggerContinuation(newMessageCount, emotionScore, lastContinuationAt, persona.continuation_frequency || 30);
      if (triggerContinuation) {
        const { data: contPrompts } = await supabase.from("continuation_prompts").select("*").eq("persona_id", persona.id).eq("is_active", true).limit(3);
        if (contPrompts && contPrompts.length > 0) {
          continuationPrompt = contPrompts[Math.floor(Math.random() * contPrompts.length)];
        }
      }
    } catch (e) { console.error("Continuation error:", e); }

    // ── STEP 7: Update conversation state (safe) ──
    try {
      await supabase.from("conversations").update({
        message_count: newMessageCount, emotion_score: emotionScore,
        current_tension_score: tensionResult.newScore, updated_at: new Date().toISOString(),
      }).eq("id", convId);
    } catch (e) { console.error("Conversation update error:", e); }

    // ── STEP 8: Return response ──
    return NextResponse.json({
      message: aiResponse,
      conversationId: convId,
      emotionScore,
      responseSource,
      tension: {
        score: tensionResult.newScore, band: tensionResult.newBand,
        delta: tensionResult.delta, previousBand: tensionResult.previousBand,
        rewardTriggered: tensionResult.rewardTriggered,
        phrase: tensionResult.phrase,
      },
      injectedMoment,
      showCustomRequestCard,
      continuationPrompt: continuationPrompt ? {
        id: continuationPrompt.id, line: continuationPrompt.continuation_line,
        cta: continuationPrompt.popup_cta, price: continuationPrompt.price,
      } : null,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
