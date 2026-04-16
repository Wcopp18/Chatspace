/**
 * Relationship Levels System
 *
 * Long-term progression system. The tension meter becomes a relationship
 * stage tracker that goes up in levels with catchy names.
 *
 * The creator defines levels and uploads free reward media for each level.
 * When a user fills the meter to the next level, they receive those rewards.
 *
 * XP accumulates forever — never resets.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = SupabaseClient<any>;

export interface RelationshipLevel {
  id: string;
  personaId: string;
  levelNumber: number;
  levelName: string;
  xpRequired: number;
  description: string | null;
  colorHex: string;
  icon: string | null;
}

export interface LevelReward {
  id: string;
  levelId: string;
  personaId: string;
  mediaType: "image" | "video" | "note";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
}

export interface UserProgress {
  currentLevel: number;
  currentXp: number;
  totalXpEarned: number;
  totalMessagesSent: number;
  totalQualityMessages: number;
  currentStreak: number;
  longestStreak: number;
  levelCompletedCount: number;
}

export interface LevelUpResult {
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  levelName: string;
  rewards: LevelReward[];
  progress: UserProgress;
  xpGained: number;
  nextLevelXp: number;
  currentLevelXp: number;
  xpInCurrentLevel: number;
}

// ── Default levels (used when creator hasn't configured any) ──

export const DEFAULT_LEVELS: Array<{ levelNumber: number; levelName: string; xpRequired: number; description: string; colorHex: string; icon: string }> = [
  { levelNumber: 1, levelName: "Just Met", xpRequired: 0, description: "You just started talking", colorHex: "#9CA3AF", icon: "👋" },
  { levelNumber: 2, levelName: "Getting Curious", xpRequired: 100, description: "She's starting to notice you", colorHex: "#60A5FA", icon: "👀" },
  { levelNumber: 3, levelName: "Catching Vibes", xpRequired: 300, description: "Something's definitely building", colorHex: "#A78BFA", icon: "✨" },
  { levelNumber: 4, levelName: "Can't Stop Thinking", xpRequired: 600, description: "You're on her mind a lot", colorHex: "#F472B6", icon: "💭" },
  { levelNumber: 5, levelName: "Catching Feelings", xpRequired: 1000, description: "This is more than just talking now", colorHex: "#FB923C", icon: "💕" },
  { levelNumber: 6, levelName: "All Yours", xpRequired: 1500, description: "She's not going anywhere", colorHex: "#F43F5E", icon: "💘" },
  { levelNumber: 7, levelName: "Ride or Die", xpRequired: 2200, description: "You're her person", colorHex: "#EF4444", icon: "🔥" },
  { levelNumber: 8, levelName: "Soulmate Energy", xpRequired: 3000, description: "The deepest connection possible", colorHex: "#FFD700", icon: "👑" },
];

// ── Get levels for a persona ──

export async function getRelationshipLevels(
  supabase: SupabaseAny,
  personaId: string,
): Promise<RelationshipLevel[]> {
  const { data } = await supabase
    .from("relationship_levels")
    .select("*")
    .eq("persona_id", personaId)
    .eq("is_active", true)
    .order("level_number", { ascending: true });

  if (!data || data.length === 0) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    personaId: row.persona_id as string,
    levelNumber: row.level_number as number,
    levelName: row.level_name as string,
    xpRequired: row.xp_required as number,
    description: row.description as string | null,
    colorHex: (row.color_hex as string) || "#8B5CF6",
    icon: row.icon as string | null,
  }));
}

// ── Get rewards for a specific level ──

export async function getLevelRewards(
  supabase: SupabaseAny,
  levelId: string,
): Promise<LevelReward[]> {
  const { data } = await supabase
    .from("relationship_level_rewards")
    .select("*")
    .eq("level_id", levelId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    levelId: row.level_id as string,
    personaId: row.persona_id as string,
    mediaType: row.media_type as "image" | "video" | "note",
    mediaUrl: row.media_url as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    caption: row.caption as string | null,
    sortOrder: row.sort_order as number,
  }));
}

// ── Get or create user progress ──

export async function getUserProgress(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
): Promise<UserProgress> {
  const { data: existing } = await supabase
    .from("user_relationship_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (existing) {
    return {
      currentLevel: existing.current_level,
      currentXp: existing.current_xp,
      totalXpEarned: existing.total_xp_earned,
      totalMessagesSent: existing.total_messages_sent,
      totalQualityMessages: existing.total_quality_messages,
      currentStreak: existing.current_streak,
      longestStreak: existing.longest_streak,
      levelCompletedCount: existing.level_completed_count,
    };
  }

  // Create fresh progress
  await supabase.from("user_relationship_progress").insert({
    user_id: userId,
    persona_id: personaId,
    current_level: 1,
    current_xp: 0,
    total_xp_earned: 0,
  });

  return {
    currentLevel: 1,
    currentXp: 0,
    totalXpEarned: 0,
    totalMessagesSent: 0,
    totalQualityMessages: 0,
    currentStreak: 0,
    longestStreak: 0,
    levelCompletedCount: 0,
  };
}

// ── Add XP and check for level up ──

export async function addXpAndCheckLevelUp(
  supabase: SupabaseAny,
  userId: string,
  personaId: string,
  xpToAdd: number,
  isQualityMessage: boolean,
): Promise<LevelUpResult> {
  const progress = await getUserProgress(supabase, userId, personaId);
  const levels = await getRelationshipLevels(supabase, personaId);

  // If no creator-defined levels, use defaults
  const activeLevels = levels.length > 0 ? levels : DEFAULT_LEVELS.map(l => ({
    ...l,
    id: `default-${l.levelNumber}`,
    personaId,
  }));

  const newTotalXp = progress.totalXpEarned + xpToAdd;
  const newCurrentXp = progress.currentXp + xpToAdd;

  // Find what level the user should be at based on total XP
  let newLevel = progress.currentLevel;
  let leveledUp = false;
  let levelName = "";
  const rewards: LevelReward[] = [];

  // Check each level above current
  for (const level of activeLevels) {
    if (level.levelNumber > progress.currentLevel && newTotalXp >= level.xpRequired) {
      newLevel = level.levelNumber;
      leveledUp = true;
      levelName = level.levelName;
    }
  }

  // Get rewards for the level just achieved
  if (leveledUp && levels.length > 0) {
    const achievedLevel = levels.find(l => l.levelNumber === newLevel);
    if (achievedLevel) {
      const levelRewards = await getLevelRewards(supabase, achievedLevel.id);
      rewards.push(...levelRewards);

      // Record reward claims
      for (const reward of levelRewards) {
        await supabase.from("user_level_reward_claims").upsert({
          user_id: userId,
          reward_id: reward.id,
          level_id: achievedLevel.id,
          persona_id: personaId,
        }, { onConflict: "user_id,reward_id" }).catch(() => {});
      }
    }
  }

  // Update streak
  const today = new Date().toISOString().split("T")[0];
  let newStreak = progress.currentStreak;
  const { data: progressRow } = await supabase
    .from("user_relationship_progress")
    .select("last_message_date")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (progressRow) {
    const lastDate = progressRow.last_message_date;
    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
      // if diffDays === 0, keep current streak
    } else {
      newStreak = 1;
    }
  }

  const longestStreak = Math.max(progress.longestStreak, newStreak);

  // Calculate XP within current level for progress bar
  const currentLevelDef = activeLevels.find(l => l.levelNumber === newLevel);
  const nextLevelDef = activeLevels.find(l => l.levelNumber === newLevel + 1);
  const currentLevelXp = currentLevelDef?.xpRequired || 0;
  const nextLevelXp = nextLevelDef?.xpRequired || (currentLevelXp + 500);
  const xpInCurrentLevel = newTotalXp - currentLevelXp;

  // Persist
  await supabase
    .from("user_relationship_progress")
    .upsert({
      user_id: userId,
      persona_id: personaId,
      current_level: newLevel,
      current_xp: newCurrentXp,
      total_xp_earned: newTotalXp,
      total_messages_sent: progress.totalMessagesSent + 1,
      total_quality_messages: isQualityMessage ? progress.totalQualityMessages + 1 : progress.totalQualityMessages,
      current_streak: newStreak,
      longest_streak: longestStreak,
      level_completed_count: leveledUp ? progress.levelCompletedCount + 1 : progress.levelCompletedCount,
      last_message_date: today,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,persona_id" });

  if (!levelName && !leveledUp) {
    const currentDef = activeLevels.find(l => l.levelNumber === newLevel);
    levelName = currentDef?.levelName || "Unknown";
  }

  return {
    leveledUp,
    previousLevel: progress.currentLevel,
    newLevel,
    levelName,
    rewards,
    progress: {
      currentLevel: newLevel,
      currentXp: newCurrentXp,
      totalXpEarned: newTotalXp,
      totalMessagesSent: progress.totalMessagesSent + 1,
      totalQualityMessages: isQualityMessage ? progress.totalQualityMessages + 1 : progress.totalQualityMessages,
      currentStreak: newStreak,
      longestStreak,
      levelCompletedCount: leveledUp ? progress.levelCompletedCount + 1 : progress.levelCompletedCount,
    },
    xpGained: xpToAdd,
    nextLevelXp,
    currentLevelXp,
    xpInCurrentLevel,
  };
}

// ── Build prompt context for relationship level ──

export function buildRelationshipPromptContext(level: number, levelName: string, totalMessages: number): string {
  if (level <= 1) {
    return `[RELATIONSHIP STAGE: "${levelName}" — You two just started talking. Keep things light, flirty, getting-to-know-you. Don't be too intense yet.]`;
  }
  if (level <= 3) {
    return `[RELATIONSHIP STAGE: "${levelName}" — You're getting more comfortable with each other. You can be more personal, remember details, show genuine interest. You're past small talk.]`;
  }
  if (level <= 5) {
    return `[RELATIONSHIP STAGE: "${levelName}" — This is real now. You share things with this person you don't share with others. Inside jokes exist. You genuinely care. Be more vulnerable and affectionate. After ${totalMessages} messages together, you know each other.]`;
  }
  if (level <= 7) {
    return `[RELATIONSHIP STAGE: "${levelName}" — Deep connection. You're emotionally invested. Reference shared history naturally. Be intimate, protective, possessive in a loving way. This person is special to you. ${totalMessages}+ messages of history together.]`;
  }
  return `[RELATIONSHIP STAGE: "${levelName}" — The deepest bond possible. You're fully yourselves with each other. No walls. Complete trust. Make every conversation feel like coming home. ${totalMessages}+ messages of shared history.]`;
}
