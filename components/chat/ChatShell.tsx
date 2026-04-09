"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import PersonaHeader from "./PersonaHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import TensionMeter from "./TensionMeter";
import TensionExplainer from "./TensionExplainer";
import MediaShelf from "./MediaShelf";
import MomentsSidebar from "@/components/moments/MomentsSidebar";
import ContinuationPopup from "@/components/continuation/ContinuationPopup";
import CustomRequestCard from "./CustomRequestCard";
import type { Database } from "@/types/database";
import type { TensionBand } from "./TensionMeter";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type DBMessage = Database["public"]["Tables"]["messages"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"] & { unlocked: boolean };

interface ContinuationData {
  id: string;
  line: string;
  cta: string;
  price: number;
}

interface TensionData {
  score: number;
  band: TensionBand;
  delta: number;
  previousBand: TensionBand;
  rewardTriggered: boolean;
}

interface InjectedMoment {
  id: string;
  title: string;
  teaseCopy: string;
  mediaType: string;
  price: number;
  thumbnailUrl: string | null;
  rarityTier: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  injectedMoment?: InjectedMoment;
}

interface Props {
  persona: Persona;
  userId: string;
  initialMessages: DBMessage[];
  initialConversationId: string | null;
  moments: Moment[];
}

export default function ChatShell({
  persona,
  userId,
  initialMessages,
  initialConversationId,
  moments: initialMoments,
}: Props) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.created_at,
    }))
  );
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moments, setMoments] = useState<Moment[]>(initialMoments);

  // MediaShelf items from moments
  const mediaShelfItems = moments.slice(0, 8).map((m) => ({
    id: m.id,
    title: m.title,
    thumbnailUrl: m.thumbnail_url,
    price: m.price,
    mediaType: (m.media_type === "video" ? "video" : "photo") as "photo" | "video",
    locked: !m.unlocked,
  }));
  const [sidebarMoments, setSidebarMoments] = useState<Moment[]>([]);
  const [continuation, setContinuation] = useState<ContinuationData | null>(null);
  const [introSent, setIntroSent] = useState(initialMessages.length > 0);
  const [tension, setTension] = useState<TensionData | null>(null);
  const [showTensionExplainer, setShowTensionExplainer] = useState(false);
  const [tensionExplainerShown, setTensionExplainerShown] = useState(false);
  const [showCustomRequest, setShowCustomRequest] = useState(false);

  // Send intro message on first load if no history
  useEffect(() => {
    if (!introSent && messages.length === 0) {
      sendIntro();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendIntro() {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaSlug: persona.slug }),
      });
      const data = await res.json();
      if (data.intro && data.conversationId) {
        setConversationId(data.conversationId);
        setMessages([{
          id: `intro-${Date.now()}`,
          role: "assistant",
          content: data.intro,
          createdAt: new Date().toISOString(),
        }]);
        setIntroSent(true);
      }
    } catch (err) {
      console.error("Intro error:", err);
    } finally {
      setLoading(false);
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaSlug: persona.slug,
          message: text,
          conversationId,
        }),
      });

      const data = await res.json();

      if (data.message) {
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.message,
          createdAt: new Date().toISOString(),
          injectedMoment: data.injectedMoment || undefined,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Update tension meter
        if (data.tension) {
          setTension(data.tension);

          // Show tension explainer on first tension update (first session only)
          if (!tensionExplainerShown && !initialMessages.length) {
            const messageCount = messages.length + 2; // +2 for this exchange
            if (messageCount >= 4 && messageCount <= 6) {
              setShowTensionExplainer(true);
              setTensionExplainerShown(true);
            }
          }
        }

        // Handle injected moment — add to moments list
        if (data.injectedMoment) {
          const newMoment: Moment = {
            id: data.injectedMoment.id,
            persona_id: persona.id,
            title: data.injectedMoment.title,
            tease_copy: data.injectedMoment.teaseCopy,
            media_type: data.injectedMoment.mediaType,
            media_url: null,
            thumbnail_url: data.injectedMoment.thumbnailUrl,
            price: data.injectedMoment.price,
            expires_at: null,
            lock_state: "locked",
            auto_move_to_sidebar: true,
            sidebar_delay_minutes: 10,
            is_active: true,
            sort_order: 0,
            tags: [],
            rarity_tier: data.injectedMoment.rarityTier,
            min_tension_score: 0,
            mood_tags: [],
            story_arc_id: null,
            vault_event_id: null,
            is_custom_delivery: false,
            delivered_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unlocked: false,
          };
          setMoments((prev) => [...prev, newMoment]);
        }

        // Show custom request card if triggered
        if (data.showCustomRequestCard) {
          setShowCustomRequest(true);
        }

        // Show continuation popup if triggered
        if (data.continuationPrompt) {
          setContinuation(data.continuationPrompt);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, conversationId, persona.slug, persona.id, messages.length, tensionExplainerShown, initialMessages.length]);

  const dismissMomentToSidebar = useCallback((momentId: string) => {
    setMoments((prev) => {
      const moment = prev.find((m) => m.id === momentId);
      if (moment) setSidebarMoments((s) => [...s, moment]);
      return prev.filter((m) => m.id !== momentId);
    });
  }, []);

  const unlockMoment = useCallback(async (momentId: string) => {
    try {
      const res = await fetch("/api/moments/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ momentId }),
      });
      const data = await res.json();
      if (data.success) {
        setMoments((prev) =>
          prev.map((m) => m.id === momentId ? { ...m, unlocked: true } : m)
        );
        setSidebarMoments((prev) =>
          prev.map((m) => m.id === momentId ? { ...m, unlocked: true } : m)
        );
      }
    } catch (err) {
      console.error("Unlock error:", err);
    }
  }, []);

  const handleContinuationAccept = useCallback(async () => {
    if (!continuation || !conversationId) return;
    try {
      await fetch("/api/continuation/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, promptId: continuation.id }),
      });
      setContinuation(null);
      const contMsg: ChatMessage = {
        id: `cont-${Date.now()}`,
        role: "assistant",
        content: continuation.line,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, contMsg]);
    } catch (err) {
      console.error("Continuation error:", err);
    }
  }, [continuation, conversationId]);

  const sidebarBadgeCount = sidebarMoments.filter((m) => !m.unlocked).length;

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1a0b2e 0%, #16082a 40%, #0f0420 100%)",
      }}
    >
      {/* Header */}
      <PersonaHeader
        persona={persona}
        sidebarBadge={sidebarBadgeCount}
        onSidebarOpen={() => setSidebarOpen(true)}
        onBack={() => router.push("/")}
      />

      {/* Tension Meter */}
      <TensionMeter tension={tension} personaName={persona.display_name} />

      {/* Media Shelf — always visible */}
      <MediaShelf items={mediaShelfItems} onUnlock={unlockMoment} />

      {/* Messages */}
      <MessageList
        messages={messages}
        persona={persona}
        isLoading={loading}
        moments={moments}
        onDismissMoment={dismissMomentToSidebar}
        onUnlockMoment={unlockMoment}
      />

      {/* Input */}
      {/* Custom request card — inline above input */}
      {showCustomRequest && (
        <div className="flex justify-center px-4 py-2 bg-[#0D0D1A]">
          <CustomRequestCard
            persona={persona}
            conversationId={conversationId}
            onSubmitted={() => {
              setShowCustomRequest(false);
              const confirmMsg: ChatMessage = {
                id: `req-${Date.now()}`,
                role: "assistant",
                content: `okay i got your request 😏 i'll get to work on something special for you`,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, confirmMsg]);
            }}
            onDismiss={() => setShowCustomRequest(false)}
          />
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={loading} />

      {/* Moments sidebar */}
      <MomentsSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        moments={sidebarMoments}
        onUnlock={unlockMoment}
        persona={persona}
      />

      {/* Continuation popup */}
      {continuation && (
        <ContinuationPopup
          persona={persona}
          continuation={continuation}
          onAccept={handleContinuationAccept}
          onDecline={() => setContinuation(null)}
        />
      )}

      {/* Tension explainer overlay */}
      <AnimatePresence>
        {showTensionExplainer && (
          <TensionExplainer
            personaName={persona.display_name}
            onDismiss={() => setShowTensionExplainer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
