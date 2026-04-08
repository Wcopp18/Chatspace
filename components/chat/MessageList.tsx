"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MomentCard from "@/components/moments/MomentCard";
import MediaTeaserCard from "./events/MediaTeaserCard";
import TimerUrgencyCard from "./events/TimerUrgencyCard";
import BundleRail from "./events/BundleRail";
import GirlDiscoveryRail from "./events/GirlDiscoveryRail";
import RewardProgressCard from "./events/RewardProgressCard";
import type { ChatMessage } from "./ChatShell";
import type { Database } from "@/types/database";
import type { Promotion } from "@/types/promotions";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface ActiveEvent {
  id: string;
  promotion: Promotion;
  shownAt: number;
}

interface GirlInfo {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string;
  isOnline: boolean;
  rarity: "common" | "rare" | "exclusive";
}

interface Props {
  messages: ChatMessage[];
  persona: Persona;
  isLoading: boolean;
  moments: Moment[];
  onDismissMoment: (id: string) => void;
  onUnlockMoment: (id: string) => void;
  activeEvents?: ActiveEvent[];
  onDismissEvent?: (id: string) => void;
  onEventAction?: (eventId: string) => void;
  discoveryGirls?: GirlInfo[];
  onGirlSelect?: (slug: string) => void;
}

// Inject moments contextually between messages
function getMomentInsertIndex(messages: ChatMessage[], momentIndex: number): number {
  const positions = [4, 8, 14];
  return positions[momentIndex] ?? messages.length;
}

export default function MessageList({
  messages,
  persona,
  isLoading,
  moments,
  onDismissMoment,
  onUnlockMoment,
  activeEvents = [],
  onDismissEvent,
  onEventAction,
  discoveryGirls = [],
  onGirlSelect,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeEvents.length]);

  // Build interleaved list
  const items: Array<
    | { type: "message"; msg: ChatMessage }
    | { type: "moment"; moment: Moment }
    | { type: "event"; event: ActiveEvent }
  > = [];

  let momentIdx = 0;
  let eventIdx = 0;

  messages.forEach((msg, i) => {
    items.push({ type: "message", msg });

    // Inject moments at preset positions
    const nextInsert = getMomentInsertIndex(messages, momentIdx);
    if (i + 1 === nextInsert && momentIdx < moments.length) {
      items.push({ type: "moment", moment: moments[momentIdx] });
      momentIdx++;
    }

    // Inject active events after AI messages (spaced out)
    if (msg.role === "assistant" && eventIdx < activeEvents.length) {
      // Show event after every 3rd AI message when there's one queued
      const aiMessageCount = messages.slice(0, i + 1).filter(m => m.role === "assistant").length;
      if (aiMessageCount >= 3 && aiMessageCount % 2 === 0) {
        items.push({ type: "event", event: activeEvents[eventIdx] });
        eventIdx++;
      }
    }
  });

  // If there are remaining events not yet placed, add them at the end
  while (eventIdx < activeEvents.length) {
    items.push({ type: "event", event: activeEvents[eventIdx] });
    eventIdx++;
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1 no-scrollbar">
      <div className="max-w-lg mx-auto space-y-1">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32">
            <p className="text-white/20 text-sm">Starting conversation...</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => {
            if (item.type === "message") {
              return (
                <MessageBubble
                  key={item.msg.id}
                  message={item.msg}
                  persona={persona}
                  showAvatar={
                    item.msg.role === "assistant" &&
                    (idx === 0 ||
                      items[idx - 1]?.type !== "message" ||
                      (items[idx - 1] as { type: "message"; msg: ChatMessage }).msg?.role !== "assistant")
                  }
                />
              );
            }

            if (item.type === "moment") {
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
            }

            // Event cards
            if (item.type === "event") {
              return (
                <EventCardRenderer
                  key={item.event.id}
                  event={item.event}
                  onDismiss={() => onDismissEvent?.(item.event.id)}
                  onAction={() => onEventAction?.(item.event.id)}
                  discoveryGirls={discoveryGirls}
                  onGirlSelect={onGirlSelect}
                />
              );
            }

            return null;
          })}
        </AnimatePresence>

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

// ── Event Card Renderer ──
function EventCardRenderer({
  event,
  onDismiss,
  onAction,
  discoveryGirls,
  onGirlSelect,
}: {
  event: ActiveEvent;
  onDismiss: () => void;
  onAction: () => void;
  discoveryGirls: GirlInfo[];
  onGirlSelect?: (slug: string) => void;
}) {
  const promo = event.promotion;

  switch (promo.type) {
    case "media_teaser":
      return (
        <MediaTeaserCard
          headline={promo.headline || promo.title}
          subtitle={promo.subtitle}
          previewImageUrl={promo.previewImageUrl}
          ctaText={promo.ctaText}
          price={promo.promoPrice ?? undefined}
          onUnlock={onAction}
          onDismiss={onDismiss}
        />
      );

    case "timer_urgency":
      return (
        <TimerUrgencyCard
          title={promo.title}
          subtitle={promo.subtitle}
          originalPrice={promo.originalPrice ?? 9.99}
          promoPrice={promo.promoPrice ?? 4.99}
          durationMinutes={promo.timerDurationMinutes}
          ctaText={promo.ctaText}
          previewImageUrl={promo.previewImageUrl}
          onClaim={onAction}
          onDismiss={onDismiss}
          onExpire={onDismiss}
        />
      );

    case "bundle_rail":
      return (
        <BundleRail
          title={promo.bundleTitle || promo.title}
          items={promo.bundleItems}
          onItemSelect={() => onAction()}
          onDismiss={onDismiss}
        />
      );

    case "discovery_circles":
      return (
        <GirlDiscoveryRail
          title={promo.title}
          girls={discoveryGirls}
          onGirlSelect={(slug) => onGirlSelect?.(slug)}
          onDismiss={onDismiss}
        />
      );

    case "reward_progress":
      return (
        <RewardProgressCard
          progressCopy={promo.progressCopy || promo.title}
          nextRewardLabel={promo.nextRewardLabel}
          currentProgress={0.6}
          stepsRemaining={2}
          onDismiss={onDismiss}
        />
      );

    default:
      return null;
  }
}
