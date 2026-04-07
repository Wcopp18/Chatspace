"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [text]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex-shrink-0 bg-[#0D0D1A] border-t border-white/5 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto flex items-end gap-3">
        {/* Sparkle icon */}
        <button
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-purple-400 hover:text-purple-300 transition-colors"
          aria-label="AI features"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
              fill="url(#sparkleGrad)"
            />
            <defs>
              <linearGradient id="sparkleGrad" x1="3" y1="2" x2="21" y2="22">
                <stop stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#A855F7" />
              </linearGradient>
            </defs>
          </svg>
        </button>

        {/* Input field with mic */}
        <div className="flex-1 bg-[#1E1E30] border border-white/8 rounded-full px-4 py-2.5 flex items-center gap-2 min-h-[44px]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent text-white placeholder-white/30 text-[15px] leading-relaxed resize-none focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[120px] overflow-y-auto no-scrollbar"
          />
          {/* Microphone icon */}
          <button
            className="flex-shrink-0 text-white/40 hover:text-white/60 transition-colors"
            aria-label="Voice input"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
              <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
              <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
          }}
          aria-label="Send"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M22 2L11 13"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22 11 13 2 9l20-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
