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
    <div className="flex-shrink-0 bg-[#0D0D1A]/90 backdrop-blur-xl border-t border-white/5 px-4 py-3 safe-bottom">
      <div className="max-w-lg mx-auto flex items-end gap-2">
        <div className="flex-1 bg-[#1E1E30] border border-white/8 rounded-2xl px-4 py-2.5 flex items-end gap-2 min-h-[44px]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent text-white placeholder-white/30 text-[15px] leading-relaxed resize-none focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[120px] overflow-y-auto no-scrollbar"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-11 h-11 rounded-full gradient-bg flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed glow-pink-sm"
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
