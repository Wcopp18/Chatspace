"use client";

import Image from "next/image";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

export default function TypingIndicator({ persona }: { persona: Persona }) {
  const avatarUrl =
    persona.avatar_url ||
    PLACEHOLDER_AVATARS[persona.slug] ||
    PLACEHOLDER_AVATARS["luna"];

  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10 flex-shrink-0">
        <Image
          src={avatarUrl}
          alt={persona.display_name}
          width={28}
          height={28}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
      <div className="bubble-persona px-4 py-3 flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
