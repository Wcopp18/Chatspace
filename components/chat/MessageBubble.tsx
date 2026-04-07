"use client";

import type { ChatMessage } from "./ChatShell";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

interface Props {
  message: ChatMessage;
  persona: Persona;
  showAvatar: boolean;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MessageBubble({ message, persona, showAvatar }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%]">
          <div
            className="px-4 py-2.5 rounded-2xl rounded-br-md text-white text-[15px] leading-relaxed"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
            }}
          >
            {message.content}
          </div>
          <p className="text-white/30 text-[10px] mt-1 text-right pr-1">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%]">
        <div className="bg-[#2A2A3E] px-4 py-2.5 rounded-2xl rounded-bl-md text-white text-[15px] leading-relaxed">
          {message.content}
        </div>
        <p className="text-white/30 text-[10px] mt-1 pl-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
