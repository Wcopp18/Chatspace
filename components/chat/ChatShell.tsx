"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import AuthModal from "@/components/auth/AuthModal";
import OnboardingOverlay from "@/components/onboarding/OnboardingOverlay";
import {
  evaluateEventInjection,
  createEventSessionState,
  recordEvent,
  updateSessionState,
  createDefaultPromotion,
} from "@/lib/engine/event-engine";
import type { Database } from "@/types/database";
import type { TensionBand } from "./TensionMeter";
import type { Promotion, EventSessionState } from "@/types/promotions";

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

// Event card union
interface ActiveEvent {
  id: string;
  promotion: Promotion;
  shownAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  injectedMoment?: InjectedMoment;
  eventCard?: ActiveEvent;
}

interface Props {
  persona: Persona;
  userId: string | null;
  initialMessages: DBMessage[];
  initialConversationId: string | null;
  moments: Moment[];
  isAuthenticated?: boolean;
}

// Default promotions for demo
function getDefaultPromotions(personaId: string): Promotion[] {
  const now = new Date().toISOString();
  return [
    {
      ...createDefaultPromotion("media_teaser"),
      id: "promo-teaser-1",
      personaId,
      personaIds: [personaId],
      headline: "Only You Get To See Her Like This",
      subtitle: "A private moment, just for you",
      createdAt: now,
      updatedAt: now,
    } as Promotion,
    {
      ...createDefaultPromotion("timer_urgency"),
      id: "promo-timer-1",
      personaId,
      personaIds: [personaId],
      title: "Tonight Only",
      subtitle: "She left this here just for a moment...",
      timerDurationMinutes: 30,
      originalPrice: 9.99,
      promoPrice: 4.99,
      createdAt: now,
      updatedAt: now,
    } as Promotion,
    {
      ...createDefaultPromotion("bundle_rail"),
      id: "promo-bundle-1",
      personaId,
      personaIds: [personaId],
      bundleTitle: "More from tonight",
      bundleItems: [
        { id: "b1", momentId: "m1", title: "Caught her smiling", thumbnailUrl: null, price: 1.99, imageCount: 3 },
        { id: "b2", momentId: "m2", title: "Late night vibes", thumbnailUrl: null, price: 2.99, imageCount: 5, isBestValue: true },
        { id: "b3", momentId: "m3", title: "Just woke up", thumbnailUrl: null, price: 1.99, imageCount: 2 },
        { id: "b4", momentId: "m4", title: "Getting ready", thumbnailUrl: null, price: 3.99, imageCount: 4 },
      ],
      createdAt: now,
      updatedAt: now,
    } as Promotion,
    {
      ...createDefaultPromotion("reward_progress"),
      id: "promo-progress-1",
      personaId,
      personaIds: [personaId],
      progressCopy: "2 more replies until she opens up more",
      nextRewardLabel: "Tonight's surprise",
      requiredActions: 5,
      createdAt: now,
      updatedAt: now,
    } as Promotion,
    {
      ...createDefaultPromotion("discovery_circles"),
      id: "promo-discovery-1",
      personaId,
      personaIds: [personaId],
      title: "More girls you might click with",
      createdAt: now,
      updatedAt: now,
    } as Promotion,
  ];
}

// Only use girls that exist in the DB (luna, nova, aria)
const DISCOVERY_GIRLS = [
  { id: "g1", slug: "luna", displayName: "Luna", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", isOnline: true, rarity: "rare" as const },
  { id: "g2", slug: "nova", displayName: "Nova", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face", isOnline: true, rarity: "exclusive" as const },
  { id: "g3", slug: "aria", displayName: "Aria", avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face", isOnline: false, rarity: "common" as const },
];

export default function ChatShell({
  persona,
  userId,
  initialMessages,
  initialConversationId,
  moments: initialMoments,
  isAuthenticated = true,
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
  const [sidebarMoments, setSidebarMoments] = useState<Moment[]>([]);
  const [continuation, setContinuation] = useState<ContinuationData | null>(null);
  const [introSent, setIntroSent] = useState(initialMessages.length > 0);
  const [tension, setTension] = useState<TensionData | null>(null);
  const [showTensionExplainer, setShowTensionExplainer] = useState(false);
  const [tensionExplainerShown, setTensionExplainerShown] = useState(false);

  // Auth state
  const [showAuth, setShowAuth] = useState(false);
  const [authenticated, setAuthenticated] = useState(isAuthenticated);

  // Onboarding — persist in localStorage so it only shows once
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingShown, setOnboardingShown] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("chatspace_onboarding") === "done";
    return false;
  });

  // Event engine state — use refs to avoid stale closures
  const [eventSession, setEventSession] = useState<EventSessionState>(createEventSessionState);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [promotions] = useState<Promotion[]>(() => getDefaultPromotions(persona.id));
  const lastActivityRef = useRef(Date.now());

  // Refs for stale closure fix
  const eventSessionRef = useRef(eventSession);
  eventSessionRef.current = eventSession;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const tensionRef = useRef(tension);
  tensionRef.current = tension;

  // MediaShelf items from moments
  const mediaShelfItems = moments.slice(0, 8).map((m) => ({
    id: m.id,
    title: m.title,
    thumbnailUrl: m.thumbnail_url,
    price: m.price,
    mediaType: (m.media_type === "video" ? "video" : "photo") as "photo" | "video",
    locked: !m.unlocked,
  }));

  // Show onboarding for newly authenticated users on first visit
  useEffect(() => {
    if (isAuthenticated && !onboardingShown) {
      setShowOnboarding(true);
      setOnboardingShown(true);
      localStorage.setItem("chatspace_onboarding", "done");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send intro message on first load — guard for auth
  useEffect(() => {
    if (!introSent && messages.length === 0) {
      if (authenticated) {
        sendIntro();
      } else {
        // Static teaser for unauthenticated deep-link users
        setMessages([{
          id: "teaser-intro",
          role: "assistant",
          content: `Hey... I was hoping you'd find me here 💜`,
          createdAt: new Date().toISOString(),
        }]);
        setIntroSent(true);
      }
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

  // ── Event engine evaluation — uses refs to avoid stale closures ──
  const evaluateEvents = useCallback(() => {
    const session = eventSessionRef.current;
    const currentTension = tensionRef.current;
    const currentMessages = messagesRef.current;

    const updatedSession = updateSessionState(session, {
      messageExchangeCount: Math.floor(currentMessages.length / 2),
      tensionScore: currentTension?.score ?? 0,
      tensionBand: currentTension?.band ?? "warming_up",
      inactivitySeconds: Math.floor((Date.now() - lastActivityRef.current) / 1000),
    });

    const decision = evaluateEventInjection(updatedSession, promotions);

    if (decision.shouldInject && decision.promotion) {
      const newEvent: ActiveEvent = {
        id: `event-${Date.now()}`,
        promotion: decision.promotion,
        shownAt: Date.now(),
      };

      setActiveEvents((prev) => [...prev, newEvent]);
      const newSession = recordEvent(updatedSession, decision.promotion.id, decision.promotion.type);
      setEventSession(newSession);
      eventSessionRef.current = newSession;
    } else {
      setEventSession(updatedSession);
      eventSessionRef.current = updatedSession;
    }
  }, [promotions]); // only depends on promotions (static)

  // Keep ref in sync for setTimeout calls
  const evaluateEventsRef = useRef(evaluateEvents);
  evaluateEventsRef.current = evaluateEvents;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    // Check auth - if not authenticated, show auth modal
    if (!authenticated) {
      setShowAuth(true);
      return;
    }

    lastActivityRef.current = Date.now();

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
          tensionRef.current = data.tension;

          if (!tensionExplainerShown && !initialMessages.length) {
            const messageCount = messagesRef.current.length + 2;
            if (messageCount >= 4 && messageCount <= 6) {
              setShowTensionExplainer(true);
              setTensionExplainerShown(true);
            }
          }
        }

        // Handle injected moment
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

        // Show continuation popup if triggered
        if (data.continuationPrompt) {
          setContinuation(data.continuationPrompt);
        }

        // Evaluate event injection — uses ref to avoid stale closure
        setTimeout(() => evaluateEventsRef.current(), 500);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, conversationId, persona.slug, persona.id, tensionExplainerShown, initialMessages.length, authenticated]);

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

  // Dismiss event — record in history so maxPerSession counts it
  const dismissEvent = useCallback((eventId: string) => {
    setActiveEvents((prev) => {
      const event = prev.find((e) => e.id === eventId);
      if (event) {
        const newSession = recordEvent(
          eventSessionRef.current,
          event.promotion.id,
          event.promotion.type,
        );
        setEventSession(newSession);
        eventSessionRef.current = newSession;
      }
      return prev.filter((e) => e.id !== eventId);
    });
  }, []);

  // Auth success — full reload to get server data with new session
  const handleAuthSuccess = useCallback(() => {
    setShowAuth(false);
    // Store onboarding flag before reload
    if (!onboardingShown) {
      localStorage.setItem("chatspace_onboarding_pending", "true");
    }
    // Full reload to pick up server-side auth data
    window.location.reload();
  }, [onboardingShown]);

  const handleOnboardingDismiss = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem("chatspace_onboarding", "done");
    // Clear pending flag
    localStorage.removeItem("chatspace_onboarding_pending");
  }, []);

  // Check for pending onboarding after auth redirect reload
  useEffect(() => {
    if (typeof window !== "undefined" && isAuthenticated) {
      const pending = localStorage.getItem("chatspace_onboarding_pending");
      if (pending === "true") {
        setShowOnboarding(true);
        localStorage.removeItem("chatspace_onboarding_pending");
      }
    }
  }, [isAuthenticated]);

  const sidebarBadgeCount = sidebarMoments.filter((m) => !m.unlocked).length;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0D0D1A] overflow-hidden">
      {/* Header */}
      <PersonaHeader
        persona={persona}
        sidebarBadge={sidebarBadgeCount}
        onSidebarOpen={() => setSidebarOpen(true)}
        onBack={() => router.push("/")}
        tensionScore={tension?.score}
      />

      {/* Tension Meter */}
      <TensionMeter tension={tension} personaName={persona.display_name} />

      {/* Media Shelf */}
      {mediaShelfItems.length > 0 && (
        <MediaShelf items={mediaShelfItems} onUnlock={unlockMoment} />
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        persona={persona}
        isLoading={loading}
        moments={moments}
        onDismissMoment={dismissMomentToSidebar}
        onUnlockMoment={unlockMoment}
        activeEvents={activeEvents}
        onDismissEvent={dismissEvent}
        messageExchangeCount={Math.floor(messages.length / 2)}
        onEventAction={(eventId) => {
          if (!authenticated) {
            setShowAuth(true);
            return;
          }
          dismissEvent(eventId);
        }}
        discoveryGirls={DISCOVERY_GIRLS}
        onGirlSelect={(slug) => router.push(`/chat/${slug}`)}
      />

      {/* Input */}
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

      {/* Auth modal */}
      <AnimatePresence>
        {showAuth && (
          <AuthModal
            open={true}
            onClose={() => setShowAuth(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>

      {/* Onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingOverlay
            personaName={persona.display_name}
            onDismiss={handleOnboardingDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
