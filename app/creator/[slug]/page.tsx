export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PersonaEditor from "@/components/creator/PersonaEditor";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CreatorPersonaPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!persona) notFound();

  const { data: phrases } = await supabase
    .from("persona_phrase_bank")
    .select("*")
    .eq("persona_id", persona.id)
    .order("phrase_type");

  const { data: moments } = await supabase
    .from("moments")
    .select("*")
    .eq("persona_id", persona.id)
    .order("sort_order");

  const { data: continuationPrompts } = await supabase
    .from("continuation_prompts")
    .select("*")
    .eq("persona_id", persona.id);

  return (
    <PersonaEditor
      persona={persona}
      phrases={phrases || []}
      moments={moments || []}
      continuationPrompts={continuationPrompts || []}
      personaId={persona.id}
    />
  );
}
