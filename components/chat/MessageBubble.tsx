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
            className="px-5 py-3 rounded-[24px] text-white text-[14.5px] leading-[22px]"
            style={{
              background: "linear-gradient(167.806deg, #9810fa 0%, #155dfc 100%)",
              boxShadow: "0 4px 24px rgba(152, 16, 250, 0.55), 0 0 1px rgba(255,255,255,0.1) inset",
              borderBottomRightRadius: "8px",
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
          className="px-5 py-3 rounded-[24px] text-white/95 text-[14.5px] leading-[22px] backdrop-blur-md"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            borderBottomLeftRadius: "8px",
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
