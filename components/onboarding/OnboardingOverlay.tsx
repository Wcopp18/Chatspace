"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  personaName: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: "&#128172;",
    title: "She's the conversation",
    description: "Everything here is between you and her. The longer you talk, the more real it gets.",
    accent: "from-purple-500 to-blue-500",
  },
  {
    icon: "&#10024;",
    title: "Surprises happen naturally",
    description: "Private moments, photos, and drops appear while you're chatting. You can't predict when.",
    accent: "from-pink-500 to-purple-500",
  },
  {
    icon: "&#9200;",
    title: "Some things don't last",
    description: "Urgency timers and limited drops are temporary. When they're gone, they're gone.",
    accent: "from-red-500 to-pink-500",
  },
  {
    icon: "&#128293;",
    title: "The tension meter matters",
    description: "The more you vibe, the higher the tension rises. Higher tension unlocks more surprising things.",
    accent: "from-amber-500 to-purple-500",
  },
  {
    icon: "&#128156;",
    title: "Stay and discover more",
    description: "More girls in her circle, reward progress, and exclusive content unlock the longer you stay.",
    accent: "from-purple-500 to-pink-500",
  },
];

export default function OnboardingOverlay({ personaName, onDismiss }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  function next() {
    if (isLast) {
      onDismiss();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function prev() {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Card */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="relative z-10 w-full max-w-sm mx-4 mb-[calc(2rem+env(safe-area-inset-bottom))] sm:mb-0"
      >
        {/* Skip button */}
        <div className="flex justify-end mb-3">
          <button
            onClick={onDismiss}
            className="text-white/30 text-xs font-medium hover:text-white/50 transition-colors px-2 py-1"
          >
            Skip
          </button>
        </div>

        <div className="bg-[#13131F] border border-white/10 rounded-2xl overflow-hidden">
          {/* Glow */}
          <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full blur-3xl pointer-events-none bg-gradient-to-r ${step.accent} opacity-20`} />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-6 pt-8 text-center"
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br ${step.accent} shadow-lg`}
                style={{ boxShadow: "0 0 30px rgba(139, 92, 246, 0.3)" }}
              >
                <span className="text-2xl" dangerouslySetInnerHTML={{ __html: step.icon }} />
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-lg">{step.title}</h3>

              {/* Description */}
              <p className="text-white/50 text-sm mt-2 leading-relaxed max-w-[280px] mx-auto">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pb-4">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "w-6 bg-purple-500"
                    : idx < currentStep
                      ? "w-1.5 bg-purple-500/50"
                      : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={prev}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-semibold text-sm transition-all active:scale-[0.98] hover:border-white/20"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
              }}
            >
              {isLast ? `Start chatting with ${personaName}` : "Next"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
