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
              background: "linear-gradient(135deg, #4F46E5 0%, #6D5BD9 50%, #8B5CF6 100%)",
              boxShadow: "0 4px 24px rgba(124, 91, 246, 0.4)",
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
          className="px-4 py-2.5 rounded-2xl rounded-bl-md text-white text-[15px] leading-relaxed backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg, rgba(38, 28, 55, 0.85) 0%, rgba(28, 20, 42, 0.85) 100%)",
            border: "1px solid rgba(168, 85, 247, 0.18)",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
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
