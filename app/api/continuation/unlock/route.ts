import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { PRICING } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, promptId, personaSlug, leavingLine } = await request.json();

  // MVP: simulate payment
  await supabase.from("continuation_unlocks").insert({
    user_id: user.id,
    conversation_id: conversationId,
    prompt_id: promptId,
    amount_paid: PRICING.EMOTIONAL_CONTINUATION,
    stripe_payment_id: `mock_cont_${Date.now()}`,
  });

  await supabase
    .from("conversations")
    .update({ last_continuation_at: new Date().toISOString() })
    .eq("id", conversationId);

  // ── Generate in-character resolution line ───────────────────────────────
  // The girl just said something like "ugh my battery is at 3% 😭" or
  // "someone just texted me hold on" or "I should head out in a sec".
  // Now she's "back" — we ask Claude to send ONE warm, in-character message
  // that resolves THE SAME excuse she gave (found charger, signal came back,
  // sent them away, decided to stay anyway, etc.). Never transactional.
  let resolutionMessage: string | null = null;
  try {
    if (personaSlug && typeof leavingLine === "string" && leavingLine.trim()) {
      const { data: persona } = await supabase
        .from("personas")
        .select("display_name, bio, warmth, tease_level, texting_style, emoji_style, sentence_length")
        .eq("slug", personaSlug)
        .single();

      if (persona) {
        const sys = `You are ${persona.display_name}. ${persona.bio || ""}
Voice: ${persona.texting_style}, emoji ${persona.emoji_style}, sentence length ${persona.sentence_length}, warmth ${persona.warmth}/10, tease ${persona.tease_level}/10.

A moment ago you said you had to pause/leave. Your exact line was:
"${leavingLine}"

You're back now and want to send ONE short, in-character message that explains the SITUATION RESOLVED ITSELF so you can keep talking. Match the specific excuse you gave:
- battery/phone dying → you found a charger / plugged in
- bad service/signal/wifi → signal came back / moved spots
- sleepy/tired → got a second wind / not actually that tired
- have to be up early → eh you'll be tired tomorrow / it's worth it
- someone texted/called → you sent them away / told them you're busy
- have to head out / errand → it can wait / you decided to stay
- "didn't mean to stay this long" → admit you stayed anyway because of him
- "shouldn't get too comfortable" → admit you couldn't help it
- generic soft exit → something just made it easier to stay

Tone: warm, soft, a little playful. Like she's slipping back into the conversation, not making an announcement.

ABSOLUTE RULES:
- Never mention money, payment, "you paid", "you bought", subscriptions, the app, or anything transactional. The UI handled all of that. From her perspective the time just happened naturally.
- Do not break character.
- ONE message only. Match her texting style (lowercase ok if that's her vibe). Keep it short — one or two sentences. Emoji ok if it fits her.`;

        const ai = getAIProvider("claude");
        const generated = await ai.chat({
          messages: [{ role: "user", content: "(she's back — send the in-character follow-up now)" }],
          systemPrompt: sys,
          maxTokens: 90,
          temperature: 0.95,
        });
        resolutionMessage = generated?.trim() || null;

        if (resolutionMessage) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: resolutionMessage,
            source: "claude",
          });
        }
      }
    }
  } catch (e) {
    console.error("Continuation resolution generation error:", e);
  }

  return NextResponse.json({ success: true, resolutionMessage });
}
