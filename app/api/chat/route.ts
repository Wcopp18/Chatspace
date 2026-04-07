import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { buildContextualPrompt } from "@/lib/ai/persona-engine";
import { calculateEmotionScore, shouldTriggerContinuation } from "@/lib/utils";
import {
  routeResponse,
  recordResponseUsage,
  logRoutingDecision,
  analyzeFlirtIntensity,
  updateTension,
  getTensionBand,
  selectMomentForInjection,
  extractMemories,
  saveMemories,
  selectCallback,
} from "@/lib/engine";
import type { PersonaContext, AIMessage } from "@/lib/ai/types";
import type { Database, TensionBand } from "@/types/database";

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
    const currentTensionScore = Number(conversation?.current_tension_score || 0);
    const currentBand = getTensionBand(currentTensionScore);

    // ── STEP 1: Extract and save memories from user message ──
    const extractedMemories = extractMemories(message);
    if (extractedMemories.length > 0) {
      saveMemories(supabase, user.id, persona.id, extractedMemories).catch(console.error);
    }

    // ── STEP 2: Response routing (prewritten vs Claude) ──
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

    let aiResponse: string;
    let responseSource: string;

    if (routingDecision.route === "prewritten" && routingDecision.prewrittenResponse) {
      // Use prewritten response
      aiResponse = routingDecision.prewrittenResponse.content;
      responseSource = "prewritten";

      // Record usage for anti-repeat
      await recordResponseUsage(
        supabase,
        user.id,
        persona.id,
        routingDecision.prewrittenResponse.id,
        routingDecision.prewrittenResponse.semanticGroup,
      );
    } else {
      // Fall back to Claude
      // Check for memory callback to inject
      const callbackLine = await selectCallback(supabase, user.id, persona.id, currentMessageCount);

      const systemPrompt = buildContextualPrompt(personaCtx, aiMessages, message);
      const fullPrompt = callbackLine
        ? `${systemPrompt}\n\n[CALLBACK OPPORTUNITY: Consider naturally weaving in this memory reference: "${callbackLine}"]`
        : systemPrompt;

      const ai = getAIProvider("claude");
      aiResponse = await ai.chat({
        messages: aiMessages,
        systemPrompt: fullPrompt,
        maxTokens: 250,
        temperature: 0.85,
      });
      responseSource = "claude";
    }

    // ── STEP 3: Save messages ──
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: aiResponse,
      source: responseSource,
      prewritten_response_id: routingDecision.prewrittenResponse?.id || null,
    });

    // ── STEP 4: Update tension ──
    const lastMessageTime = messageHistory && messageHistory.length > 0
      ? new Date(messageHistory[messageHistory.length - 1].created_at).getTime()
      : Date.now();
    const responseSpeed = (Date.now() - lastMessageTime) / 1000;

    const flirtIntensity = analyzeFlirtIntensity(message);

    const tensionResult = await updateTension(supabase, user.id, persona.id, convId, {
      messageLength: message.length,
      flirtIntensity,
      toneMatch: 0.5, // Default — could be enhanced with NLP
      responseSpeed,
      isRepetitive: false, // Could be enhanced with dedup check
      isOffTopic: false,   // Could be enhanced with topic continuity check
      personaMoodMultiplier: 1.0,
      recentUnlockCooldown: false,
      streakDays: 0,
      totalPurchases: 0,
    });

    // ── STEP 5: Check for premium moment injection ──
    let injectedMoment = null;
    if (tensionResult.rewardTriggered) {
      const candidate = await selectMomentForInjection(supabase, {
        userId: user.id,
        personaId: persona.id,
        tensionBand: tensionResult.newBand,
        tensionScore: tensionResult.newScore,
        moodTag: routingDecision.moodDetected,
        conversationId: convId,
      });

      if (candidate) {
        injectedMoment = {
          id: candidate.moment.id,
          title: candidate.moment.title,
          teaseCopy: candidate.teaserLine,
          mediaType: candidate.moment.media_type,
          price: candidate.moment.price,
          thumbnailUrl: candidate.moment.thumbnail_url,
          rarityTier: candidate.moment.rarity_tier,
        };
      }
    }

    // ── STEP 5b: Detect custom request intent ──
    const customRequestPatterns = [
      /custom\s*(video|image|photo|pic|content)/i,
      /make\s*(me\s*)?(a\s*)?(video|image|photo)/i,
      /request\s*(a\s*)?(video|image|photo|custom)/i,
      /can\s*you\s*(make|create|film|shoot|do)/i,
      /i\s*want\s*(a\s*)?(custom|personal|special)\s*(video|image|photo)/i,
    ];
    const showCustomRequestCard = customRequestPatterns.some(p => p.test(message));

    // ── STEP 6: Calculate emotion and check continuation ──
    const allMessages = [...aiMessages, { role: "assistant" as const, content: aiResponse }];
    const emotionScore = calculateEmotionScore(allMessages);
    const newMessageCount = currentMessageCount + 2;

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

    // ── STEP 7: Update conversation state ──
    const prewrittenDelta = responseSource === "prewritten" ? 1 : 0;
    const claudeDelta = responseSource === "claude" ? 1 : 0;

    await supabase
      .from("conversations")
      .update({
        message_count: newMessageCount,
        emotion_score: emotionScore,
        current_tension_score: tensionResult.newScore,
        total_prewritten_count: (conversation?.total_prewritten_count || 0) + prewrittenDelta,
        total_claude_count: (conversation?.total_claude_count || 0) + claudeDelta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convId);

    // ── STEP 8: Log routing decision (async, non-blocking) ──
    logRoutingDecision(
      supabase,
      convId,
      message,
      routingDecision,
      tensionResult.newScore,
      aiResponse,
    ).catch(console.error);

    // ── STEP 9: Return response ──
    return NextResponse.json({
      message: aiResponse,
      conversationId: convId,
      emotionScore,
      responseSource,
      tension: {
        score: tensionResult.newScore,
        band: tensionResult.newBand,
        delta: tensionResult.delta,
        previousBand: tensionResult.previousBand,
        rewardTriggered: tensionResult.rewardTriggered,
      },
      injectedMoment,
      showCustomRequestCard,
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
