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
            className="px-4 py-2.5 rounded-2xl rounded-br-md text-white text-[15px] leading-relaxed shadow-lg"
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%)",
              boxShadow: "0 4px 20px rgba(139, 92, 246, 0.35)",
            }}
          >
            {message.content}
          </div>
          <p className="text-white/40 text-[10px] mt-1 text-right pr-1">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%]">
        <div
          className="px-4 py-2.5 rounded-2xl rounded-bl-md text-white text-[15px] leading-relaxed backdrop-blur-sm"
          style={{
            background: "linear-gradient(135deg, rgba(55, 40, 95, 0.75) 0%, rgba(40, 28, 75, 0.75) 100%)",
            border: "1px solid rgba(139, 92, 246, 0.15)",
          }}
        >
          {message.content}
        </div>
        <p className="text-white/40 text-[10px] mt-1 pl-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
