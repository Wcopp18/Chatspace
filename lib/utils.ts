import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateEmotionScore(messages: Array<{ content: string; role: string }>): number {
  const emotionalKeywords = [
    "love", "miss", "want", "need", "feel", "heart", "beautiful", "amazing",
    "perfect", "incredible", "obsessed", "crazy", "dream", "forever", "always",
    "never", "please", "stay", "don't go", "everything", "only you"
  ];

  const recentMessages = messages.slice(-5);
  let score = 0;

  recentMessages.forEach((msg) => {
    const lower = msg.content.toLowerCase();
    emotionalKeywords.forEach((keyword) => {
      if (lower.includes(keyword)) score += 0.1;
    });
  });

  return Math.min(score, 1.0);
}

export function shouldTriggerContinuation(
  messageCount: number,
  emotionScore: number,
  lastContinuationAt: Date | null,
  cooldownMinutes: number
): boolean {
  const now = new Date();

  if (lastContinuationAt) {
    const minutesSince = (now.getTime() - lastContinuationAt.getTime()) / 60000;
    if (minutesSince < cooldownMinutes) return false;
  }

  if (messageCount >= 20 && messageCount % 10 === 0) return true;
  if (emotionScore >= 0.7) return true;

  return false;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
