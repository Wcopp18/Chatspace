"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MomentCard from "@/components/moments/MomentCard";
import BundleCard from "./BundleCard";
import type { ChatMessage } from "./ChatShell";
import type { Database } from "@/types/database";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface Props {
  messages: ChatMessage[];
  persona: Persona;
  isLoading: boolean;
  moments: Moment[];
  conversationId: string | null;
  onDismissMoment: (id: string) => void;
  onUnlockMoment: (id: string) => void;
  onUnlockBundle: (id: string) => Promise<void>;
}

// Inject moments contextually between messages
function getMomentInsertIndex(messages: ChatMessage[], momentIndex: number): number {
  const positions = [4, 8, 14]; // After Nth message
  return positions[momentIndex] ?? messages.length;
}

export default function MessageList({
  messages,
  persona,
  isLoading,
  moments,
  conversationId,
  onDismissMoment,
  onUnlockMoment,
  onUnlockBundle,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Build interleaved list of messages + moments
  const items: Array<
    | { type: "message"; msg: ChatMessage }
    | { type: "moment"; moment: Moment }
  > = [];

  let momentIdx = 0;

  messages.forEach((msg, i) => {
    items.push({ type: "message", msg });

    // Check if a moment should be injected after this message
    const nextInsert = getMomentInsertIndex(messages, momentIdx);
    if (i + 1 === nextInsert && momentIdx < moments.length) {
      items.push({ type: "moment", moment: moments[momentIdx] });
      momentIdx++;
    }
  });

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1 no-scrollbar">
      <div className="max-w-lg mx-auto space-y-1">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32">
            <p className="text-white/20 text-sm">Starting conversation…</p>
          </div>
        )}

        {items.map((item, idx) => {
          if (item.type === "message") {
            const msg = item.msg;
            return (
              <div key={msg.id}>
                <MessageBubble
                  message={msg}
                  persona={persona}
                  showAvatar={
                    msg.role === "assistant" &&
                    (idx === 0 ||
                      items[idx - 1]?.type !== "message" ||
                      (items[idx - 1] as { type: "message"; msg: ChatMessage }).msg?.role !== "assistant")
                  }
                />
                {msg.injectedBundle && !msg.bundleUnlocked && (
                  <div className="mt-2 mb-1 max-w-[85%]">
                    <BundleCard
                      id={msg.injectedBundle.id}
                      title={msg.injectedBundle.title}
                      introLine={msg.injectedBundle.introLine}
                      price={msg.injectedBundle.price}
                      itemCount={msg.injectedBundle.itemCount}
                      thumbnailUrl={msg.injectedBundle.thumbnailUrl}
                      conversationId={conversationId}
                      onUnlock={onUnlockBundle}
                    />
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={`moment-${item.moment.id}`} className="py-2">
              <MomentCard
                moment={item.moment}
                persona={persona}
                onDismiss={() => onDismissMoment(item.moment.id)}
                onUnlock={() => onUnlockMoment(item.moment.id)}
              />
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-end gap-2 pt-1">
            <TypingIndicator persona={persona} />
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>
    </div>
  );
}
