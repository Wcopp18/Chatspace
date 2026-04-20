/**
 * Message Quality Scoring
 *
 * Single clean helper that judges an incoming user message and returns a
 * stable score (0-100), category (high / medium / low), and the flags
 * that produced it. Upstream systems (Hidden Progress, Surprise Gesture,
 * Anti-Gaming) all feed off this.
 *
 * Scoring looks at:
 *   - effort (length, detail)
 *   - warmth / flirt intensity
 *   - emotional openness / vulnerability
 *   - relevance (not total topic whiplash; soft-detected)
 *   - repetition (Jaccard similarity against recent user messages)
 *   - spam / demanding / mood-breaking patterns
 */

import { analyzeMessage } from "./tension-engine";

export type QualityCategory = "high" | "medium" | "low";

export interface QualityScore {
  score: number;                    // 0-100
  category: QualityCategory;
  flags: string[];
  repetitionSimilarity: number;     // 0-1, max similarity vs recent history
  signals: {
    effort: number;                 // 0-1
    warmth: number;                 // 0-1 (flirt intensity)
    openness: number;               // 0-1
    relevance: number;              // 0-1
    isSpammy: boolean;
    isDemanding: boolean;
    isMoodBreaking: boolean;
    isDry: boolean;
  };
}

// ── Tokenisation + Jaccard ──

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter(t => t.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
}

export function maxRepetitionSimilarity(text: string, recent: string[]): number {
  if (recent.length === 0) return 0;
  const a = tokenize(text);
  let max = 0;
  for (const r of recent) {
    const s = jaccard(a, tokenize(r));
    if (s > max) max = s;
  }
  return max;
}

// ── Effort score ──

function effortScore(messageLength: number, openness: number, flirt: number): number {
  // Length (0.7 weight), presence of emotional content (0.3 weight)
  const lengthScore = Math.min(messageLength / 120, 1); // saturates at 120 chars
  const contentScore = Math.min(openness + flirt * 0.5, 1);
  return Math.min(1, lengthScore * 0.7 + contentScore * 0.5);
}

// ── Relevance (very soft: presence of pronouns / questions / past-reference tokens) ──

const RELEVANCE_HINTS = [
  /\byou('re|r)?\b/i,
  /\bi\b/i,
  /\bwe\b/i,
  /\?/,
  /\b(yesterday|earlier|last\s+(night|time)|remember|you said)\b/i,
];

function relevanceScore(text: string): number {
  let hits = 0;
  for (const p of RELEVANCE_HINTS) if (p.test(text)) hits++;
  return Math.min(hits / 3, 1); // 3 hits = fully relevant
}

// ── Main scorer ──

export function scoreMessage(text: string, recentUserMessages: string[] = []): QualityScore {
  const analysis = analyzeMessage(text);

  const repSim = maxRepetitionSimilarity(text, recentUserMessages);
  const effort = effortScore(analysis.messageLength, analysis.emotionalOpenness, analysis.flirtIntensity);
  const relevance = relevanceScore(text);

  const flags: string[] = [];

  // Positive contributions (0-100 pool)
  let score = 0;
  score += effort * 30;               // up to 30
  score += analysis.flirtIntensity * 20;       // up to 20
  score += analysis.emotionalOpenness * 25;    // up to 25
  score += relevance * 15;                     // up to 15
  score += analysis.isHighInvestment ? 10 : 0; // up to 10

  if (effort > 0.5) flags.push("effort");
  if (analysis.flirtIntensity > 0.3) flags.push("warm");
  if (analysis.emotionalOpenness > 0.3) flags.push("open");
  if (relevance > 0.6) flags.push("relevant");
  if (analysis.isHighInvestment) flags.push("invested");

  // Negative modifiers
  if (analysis.isSpammy)       { score -= 50; flags.push("spam"); }
  if (analysis.isDemanding)    { score -= 45; flags.push("demanding"); }
  if (analysis.isMoodBreaking) { score -= 50; flags.push("mood_break"); }
  if (analysis.isDry)          { score -= 15; flags.push("dry"); }

  // Repetition penalty — gradual beyond 0.6 similarity
  if (repSim > 0.6) {
    const pen = Math.min(30, (repSim - 0.6) * 100);
    score -= pen;
    flags.push(repSim > 0.85 ? "near_duplicate" : "repetitive");
  }

  score = Math.max(0, Math.min(100, score));

  let category: QualityCategory;
  if (score >= 55) category = "high";
  else if (score >= 25) category = "medium";
  else category = "low";

  return {
    score: Math.round(score),
    category,
    flags,
    repetitionSimilarity: Math.round(repSim * 100) / 100,
    signals: {
      effort: Math.round(effort * 100) / 100,
      warmth: Math.round(analysis.flirtIntensity * 100) / 100,
      openness: Math.round(analysis.emotionalOpenness * 100) / 100,
      relevance: Math.round(relevance * 100) / 100,
      isSpammy: analysis.isSpammy,
      isDemanding: analysis.isDemanding,
      isMoodBreaking: analysis.isMoodBreaking,
      isDry: analysis.isDry,
    },
  };
}
