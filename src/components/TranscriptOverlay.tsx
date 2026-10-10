import React, { useEffect, useRef } from "react";
import { TranscriptEntry } from "../types/jarvis";

interface TranscriptOverlayProps {
  transcripts: TranscriptEntry[];
  isOpen: boolean;
  onClear: () => void;
}

export const TranscriptOverlay: React.FC<TranscriptOverlayProps> = ({
  transcripts,
  isOpen,
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, isOpen]);

  if (!isOpen || transcripts.length === 0) {
    return null;
  }

  // Show the most recent turns so the 3D core remains the main visual focus
  const visibleEntries = transcripts.slice(-6);

  return (
    <div className="w-full max-w-xl mx-auto px-4 pointer-events-auto">
      <div className="bg-slate-950/65 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs text-slate-400">
          <span className="font-display tracking-wider text-slate-300">
            Live Voice Transcript
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            Clear
          </button>
        </div>

        <div
          ref={scrollRef}
          className="max-h-28 sm:max-h-36 overflow-y-auto space-y-2.5 pr-1 text-sm leading-relaxed"
        >
          {visibleEntries.map((item) => {
            const isUser = item.role === "user";
            return (
              <div key={item.id} className="flex flex-col gap-0.5">
                <span
                  className={`font-display text-[11px] tracking-wider ${
                    isUser ? "text-teal-400" : "text-cyan-400"
                  }`}
                >
                  {isUser ? "YOU:" : "JARVIS:"}
                </span>
                <p
                  className={`text-xs sm:text-sm ${
                    isUser ? "text-slate-200" : "text-cyan-50"
                  }`}
                  dir="auto"
                >
                  &ldquo;{item.text.trim()}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
