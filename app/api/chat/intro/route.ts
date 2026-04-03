import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIntroMessage } from "@/lib/ai/persona-engine";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { personaSlug } = await request.json();

  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("slug", personaSlug)
    .single() as { data: Persona | null };

  if (!persona) return NextResponse.json({ error: "Persona not found" }, { status: 404 });

  const { data: phrases } = await supabase
    .from("persona_phrase_bank")
    .select("phrase")
    .eq("persona_id", persona.id)
    .eq("phrase_type", "intro")
    .eq("is_active", true);

  const introLines = (phrases || []).map((p) => (p as { phrase: string }).phrase);

  const intro = buildIntroMessage({
    personaId: persona.id,
    displayName: persona.display_name,
    bio: persona.bio || "",
    warmth: persona.warmth,
    teaseLevel: persona.tease_level,
    textingStyle: persona.texting_style,
    emojiStyle: persona.emoji_style,
    sentenceLength: persona.sentence_length,
    signaturePhrases: [],
    petNames: [],
    teaserLines: [],
    introLines,
    approvedUpsellPhrases: [],
    memories: [],
  });

  const { data: conv } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, persona_id: persona.id })
    .select()
    .single() as { data: Conversation | null };

  if (conv) {
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: intro,
    });
  }

  return NextResponse.json({ intro, conversationId: conv?.id });
}
