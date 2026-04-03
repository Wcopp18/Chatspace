"use client";

import Image from "next/image";
import type { ChatMessage } from "./ChatShell";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

const PLACEHOLDER_AVATARS: Record<string, string> = {
  luna: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  nova: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  aria: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
};

interface Props {
  message: ChatMessage;
  persona: Persona;
  showAvatar: boolean;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, persona, showAvatar }: Props) {
  const isUser = message.role === "user";
  const avatarUrl =
    persona.avatar_url ||
    PLACEHOLDER_AVATARS[persona.slug] ||
    PLACEHOLDER_AVATARS["luna"];

  if (isUser) {
    return (
      <div className="flex justify-end mb-1">
        <div className="max-w-[75%]">
          <div className="bubble-user px-4 py-2.5 text-white text-[15px] leading-relaxed">
            {message.content}
          </div>
          <p className="text-white/20 text-[10px] mt-1 text-right pr-1">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-1">
      {/* Avatar — only show when it's the first in a run */}
      <div className="flex-shrink-0 w-7">
        {showAvatar && (
          <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10">
            <Image
              src={avatarUrl}
              alt={persona.display_name}
              width={28}
              height={28}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        )}
      </div>

      <div className="max-w-[75%]">
        <div className="bubble-persona px-4 py-2.5 text-white text-[15px] leading-relaxed">
          {message.content}
        </div>
        <p className="text-white/20 text-[10px] mt-1 pl-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
