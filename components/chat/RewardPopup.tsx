"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface RewardMedia {
  id: string;
  mediaType: "image" | "video" | "note";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
}

interface LevelUpData {
  level: number;
  levelName: string;
  rewards: RewardMedia[];
}

interface SurpriseData {
  gestureType: string;
  triggerReason: string;
  reward: RewardMedia | null;
}

interface Props {
  levelUp: LevelUpData | null;
  surprise: SurpriseData | null;
  personaName: string;
  onDismiss: () => void;
  onMoveToSidebar: (reward: RewardMedia) => void;
}

export default function RewardPopup({ levelUp, surprise, personaName, onDismiss, onMoveToSidebar }: Props) {
  const [currentRewardIndex, setCurrentRewardIndex] = useState(0);
  const [phase, setPhase] = useState<"showing" | "moving">("showing");

  const rewards: RewardMedia[] = [];
  let title = "";
  let subtitle = "";

  if (levelUp && levelUp.rewards.length > 0) {
    rewards.push(...levelUp.rewards);
    title = `Level Up! ${levelUp.levelName}`;
    subtitle = `${personaName} has something special for you...`;
  } else if (surprise?.reward) {
    rewards.push(surprise.reward);
    title = getSurpriseTitle(surprise.gestureType);
    subtitle = getSurpriseSubtitle(surprise.triggerReason, personaName);
  }

  const currentReward = rewards[currentRewardIndex];

  // Auto-move to sidebar after 5 seconds
  useEffect(() => {
    if (!currentReward) return;
    const timer = setTimeout(() => {
      setPhase("moving");
      setTimeout(() => {
        onMoveToSidebar(currentReward);
        if (currentRewardIndex < rewards.length - 1) {
          setCurrentRewardIndex(i => i + 1);
          setPhase("showing");
        } else {
          onDismiss();
        }
      }, 600);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentRewardIndex, currentReward, rewards.length, onDismiss, onMoveToSidebar]);

  if (!currentReward) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onDismiss}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={phase === "showing"
            ? { scale: 1, opacity: 1, y: 0 }
            : { scale: 0.5, opacity: 0, x: 200, y: -100 }
          }
          transition={phase === "showing"
            ? { type: "spring", stiffness: 300, damping: 20 }
            : { duration: 0.5, ease: "easeIn" }
          }
          className="relative z-10 max-w-sm w-full mx-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: "radial-gradient(circle, rgba(255,60,172,0.3) 0%, transparent 70%)",
              filter: "blur(20px)",
              transform: "scale(1.2)",
            }}
          />

          <div className="relative bg-[#1a0832]/90 border border-[#FF3CAC]/30 rounded-3xl overflow-hidden">
            {/* Title */}
            <div className="text-center pt-5 pb-3 px-4">
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-bold"
                style={{
                  background: "linear-gradient(to right, #FFD700, #FF3CAC)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {title}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/50 text-sm mt-1"
              >
                {subtitle}
              </motion.p>
            </div>

            {/* Media */}
            <div className="px-4 pb-4">
              {currentReward.mediaType === "note" ? (
                <div className="bg-[#252538] rounded-2xl p-6 text-center">
                  <p className="text-white/80 text-sm italic leading-relaxed">
                    &ldquo;{currentReward.caption || "Something special just for you..."}&rdquo;
                  </p>
                  <p className="text-[#FF3CAC] text-xs mt-3">- {personaName}</p>
                </div>
              ) : currentReward.mediaUrl ? (
                currentReward.mediaType === "video" ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#252538]">
                    <video
                      src={currentReward.mediaUrl}
                      controls
                      autoPlay
                      muted
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#252538]">
                    <Image
                      src={currentReward.mediaUrl}
                      alt="Reward"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )
              ) : (
                <div className="bg-[#252538] rounded-2xl p-8 text-center">
                  <span className="text-4xl">🎁</span>
                  <p className="text-white/50 text-sm mt-2">
                    {currentReward.caption || "A special reward from " + personaName}
                  </p>
                </div>
              )}
            </div>

            {/* Caption */}
            {currentReward.caption && currentReward.mediaType !== "note" && (
              <p className="text-white/60 text-xs text-center pb-3 px-4 italic">
                &ldquo;{currentReward.caption}&rdquo;
              </p>
            )}

            {/* Progress dots for multiple rewards */}
            {rewards.length > 1 && (
              <div className="flex justify-center gap-1.5 pb-4">
                {rewards.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentRewardIndex ? "bg-[#FF3CAC]" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Dismiss hint */}
            <div className="text-center pb-4">
              <p className="text-white/20 text-[10px]">Tap anywhere to dismiss</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getSurpriseTitle(gestureType: string): string {
  switch (gestureType) {
    case "free_image": return "A Little Something...";
    case "free_video": return "Just For You";
    case "special_note": return "She Wrote You Something";
    case "daily_bundle": return "Today's Special";
    case "surprise_moment": return "Surprise!";
    default: return "Something Special";
  }
}

function getSurpriseSubtitle(triggerReason: string, personaName: string): string {
  switch (triggerReason) {
    case "chemistry_peak": return `The chemistry tonight made ${personaName} want to share this`;
    case "high_chemistry": return `${personaName} felt the vibe and wanted you to have this`;
    case "daily_vibe": return `${personaName} is in the mood to be generous`;
    case "vulnerable_vibe": return `${personaName} wanted to share something real with you`;
    case "earned_through_effort": return `You've earned this through being genuine`;
    case "random_kindness": return `${personaName} was thinking of you`;
    default: return `${personaName} has something for you`;
  }
}
