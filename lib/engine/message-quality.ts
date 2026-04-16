/**
 * Message Quality Scoring System
 *
 * Judges whether a user's message is thoughtful, warm, relevant,
 * low effort, repetitive, or spammy.
 *
 * Returns a clean score + label: high, medium, low
 */

export type QualityLabel = "high" | "medium" | "low";

export interface MessageQualityResult {
  label: QualityLabel;
  score: number;        // 0.0 to 1.0
  effort: number;       // 0.0 to 1.0
  warmth: number;       // 0.0 to 1.0
  relevance: number;    // 0.0 to 1.0
  repetition: number;   // 0.0 to 1.0 (higher = worse)
  spam: number;         // 0.0 to 1.0 (higher = worse)
  xpAwarded: number;    // XP to add to relationship progress
}

// ── Effort scoring ──

const HIGH_EFFORT_PATTERNS = [
  /\b(because|since|honestly|actually|really|genuinely|truly)\b/i,
  /\b(i think|i feel|i believe|i remember|i noticed)\b/i,
  /\b(what do you|how do you|tell me about|i was wondering)\b/i,
  /\?$/,  // ends with question
];

const LOW_EFFORT_PATTERNS = [
  /^(hi|hey|yo|sup|k|ok|lol|haha|hmm|yeah|yep|nah|nope|idk|nm|wyd)\s*$/i,
  /^.{1,4}$/,  // 4 chars or less
  /^(.)\1{3,}$/i,  // repeated single chars
  /^(lol|lmao|haha|xd|omg)\s*$/i,
];

function scoreEffort(message: string): number {
  const len = message.length;

  // Very short = low effort
  if (len < 5) return 0.1;
  if (LOW_EFFORT_PATTERNS.some(p => p.test(message))) return 0.15;

  let score = 0.3; // baseline

  // Length bonus (up to 0.3)
  if (len > 20) score += 0.1;
  if (len > 50) score += 0.1;
  if (len > 100) score += 0.1;

  // Effort patterns (up to 0.4)
  const matchCount = HIGH_EFFORT_PATTERNS.filter(p => p.test(message)).length;
  score += Math.min(matchCount * 0.1, 0.4);

  return Math.min(score, 1.0);
}

// ── Warmth scoring ──

const WARMTH_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\b(miss|love|care|adore|appreciate)\b/i, weight: 0.2 },
  { pattern: /\b(miss|love|care)\s+\w*\s*(you|u)\b/i, weight: 0.1 },
  { pattern: /\b(beautiful|gorgeous|amazing|incredible|wonderful|one of a kind)\b/i, weight: 0.15 },
  { pattern: /\bthinking\s*(about|of)\b/i, weight: 0.15 },
  { pattern: /\b(good\s*(morning|night|evening))\b/i, weight: 0.15 },
  { pattern: /\b(hope|wish|dream)\b/i, weight: 0.1 },
  { pattern: /\b(hug|cuddle|hold|kiss)\b/i, weight: 0.15 },
  { pattern: /\b(safe|comfort|special|important|trust)\b/i, weight: 0.1 },
  { pattern: /\b(thank|grateful|blessed)\b/i, weight: 0.1 },
  { pattern: /\b(sweet|kind|gentle|warm)\b/i, weight: 0.1 },
  { pattern: /\b(make my day|mean.*(to me|a lot|so much))\b/i, weight: 0.15 },
  { pattern: /[❤️💕💗🥰😘💋💖💝🥺💓😍]/u, weight: 0.1 },
];

function scoreWarmth(message: string): number {
  let score = 0;
  for (const { pattern, weight } of WARMTH_PATTERNS) {
    if (pattern.test(message)) score += weight;
  }
  return Math.min(score, 1.0);
}

// ── Relevance scoring ──

const CONVERSATION_PATTERNS = [
  /\b(you said|you mentioned|earlier|remember when|last time)\b/i,
  /\b(about what you|what you told|you were saying)\b/i,
  /\b(how was|how did|how are|how's)\b/i,
  /\b(tell me more|what happened|then what)\b/i,
  /\b(that reminds me|speaking of|by the way)\b/i,
];

function scoreRelevance(message: string, recentTopics: string[]): number {
  let score = 0.4; // baseline — most messages are somewhat relevant

  // Conversation continuation patterns
  const matches = CONVERSATION_PATTERNS.filter(p => p.test(message)).length;
  score += Math.min(matches * 0.15, 0.4);

  // Length indicates engagement
  if (message.length > 30) score += 0.1;

  // Check topic overlap with recent topics
  if (recentTopics.length > 0) {
    const messageLower = message.toLowerCase();
    const topicOverlap = recentTopics.some(topic => messageLower.includes(topic.toLowerCase()));
    if (topicOverlap) score += 0.1;
  }

  return Math.min(score, 1.0);
}

// ── Repetition scoring ──

function simpleHash(str: string): string {
  // Normalize: lowercase, remove punctuation and extra spaces
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function scoreRepetition(message: string, recentHashes: string[]): number {
  if (recentHashes.length === 0) return 0;

  const currentHash = simpleHash(message);

  // Exact repeat
  if (recentHashes.includes(currentHash)) return 0.9;

  // Similarity check — compare words
  const currentWords = new Set(currentHash.split(' '));
  let maxSimilarity = 0;

  for (const hash of recentHashes.slice(-10)) {
    const pastWords = new Set(hash.split(' '));
    const intersection = [...currentWords].filter(w => pastWords.has(w)).length;
    const union = new Set([...currentWords, ...pastWords]).size;
    const similarity = union > 0 ? intersection / union : 0;
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  if (maxSimilarity > 0.8) return 0.7;
  if (maxSimilarity > 0.6) return 0.4;
  if (maxSimilarity > 0.4) return 0.2;
  return 0;
}

// ── Spam scoring ──

const SPAM_PATTERNS = [
  /^(.)\1{5,}$/i,                      // repeated chars
  /(.{2,})\1{3,}/i,                    // repeated patterns
  /\b(send|show|give)\s*(me|now)\b/i,  // demanding content
  /\b(send\s*(nudes|pics|photos|video))\b/i,
  /\b(unlock|free|give\s*me)\b/i,
  /\b(hurry|now|faster|come\s*on)\b/i,
];

function scoreSpam(message: string): number {
  let score = 0;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(message)) score += 0.25;
  }
  return Math.min(score, 1.0);
}

// ── Main scoring function ──

export function scoreMessageQuality(
  message: string,
  recentHashes: string[] = [],
  recentTopics: string[] = [],
): MessageQualityResult {
  const effort = scoreEffort(message);
  const warmth = scoreWarmth(message);
  const relevance = scoreRelevance(message, recentTopics);
  const repetition = scoreRepetition(message, recentHashes);
  const spam = scoreSpam(message);

  // Weighted composite score
  // Positive factors: effort (30%), warmth (25%), relevance (20%)
  // Negative factors: repetition (-15%), spam (-10%)
  const rawScore = (effort * 0.30) + (warmth * 0.25) + (relevance * 0.20) - (repetition * 0.15) - (spam * 0.10);
  const score = Math.max(0, Math.min(1, rawScore));

  // Label
  let label: QualityLabel;
  if (score >= 0.40) label = "high";
  else if (score >= 0.22) label = "medium";
  else label = "low";

  // XP award based on quality
  let xpAwarded: number;
  if (label === "high") xpAwarded = 8 + Math.floor(Math.random() * 5);     // 8-12 XP
  else if (label === "medium") xpAwarded = 3 + Math.floor(Math.random() * 3); // 3-5 XP
  else xpAwarded = 0 + Math.floor(Math.random() * 2);                          // 0-1 XP

  return { label, score, effort, warmth, relevance, repetition, spam, xpAwarded };
}

// ── Hash generation for tracking ──

export function getMessageHash(message: string): string {
  return simpleHash(message);
}

// ── Topic extraction (simple keyword-based) ──

const TOPIC_KEYWORDS: Record<string, RegExp[]> = {
  flirt: [/\b(flirt|tease|wink|sexy|hot|attractive)\b/i, /😏|😘|🥵|😈/u],
  emotion: [/\b(feel|feeling|emotion|heart|soul|cry|tear|happy|sad)\b/i],
  daily: [/\b(today|morning|night|evening|afternoon|day|work|school)\b/i],
  memory: [/\b(remember|forgot|memory|last time|that time)\b/i],
  compliment: [/\b(beautiful|gorgeous|amazing|pretty|cute|stunning)\b/i],
  question: [/\?$/, /\b(what|how|why|when|where|who|do you|can you)\b/i],
  vulnerability: [/\b(scared|afraid|nervous|anxious|worried|trust|open)\b/i],
  future: [/\b(someday|together|future|one day|imagine|wish)\b/i],
};

export function extractTopics(message: string): string[] {
  const topics: string[] = [];
  for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
    if (patterns.some(p => p.test(message))) {
      topics.push(topic);
    }
  }
  return topics;
}
