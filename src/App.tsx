import React, { useState } from "react";
import { Mic, MicOff, MessageSquareText, RotateCw, Volume2 } from "lucide-react";
import { useJarvisLive } from "./hooks/useJarvisLive";
import { JarvisCore3D } from "./components/JarvisCore3D";
import { AudioWaveform } from "./components/AudioWaveform";
import { TranscriptOverlay } from "./components/TranscriptOverlay";
import { JarvisSystemState } from "./types/jarvis";

const STATE_DISPLAY_CONFIG: Record<
  JarvisSystemState,
  {
    symbol: string;
    label: string;
    subtext: string;
    textColor: string;
    dotColor: string;
  }
> = {
  CONNECTING: {
    symbol: "◌",
    label: "CONNECTING...",
    subtext: "Establishing real-time neural audio link with Gemini 3.8 Live",
    textColor: "text-slate-300",
    dotColor: "text-sky-400 animate-spin",
  },
  READY: {
    symbol: "●",
    label: "READY",
    subtext: "Voice interface initialized · Speak naturally in any language",
    textColor: "text-cyan-300",
    dotColor: "text-cyan-400",
  },
  LISTENING: {
    symbol: "●",
    label: "LISTENING...",
    subtext: "Continuous voice detection active · Speak anytime",
    textColor: "text-cyan-300",
    dotColor: "text-cyan-400 animate-pulse",
  },
  "USER SPEAKING": {
    symbol: "◉",
    label: "USER SPEAKING...",
    subtext: "Capturing real-time voice stream",
    textColor: "text-teal-300",
    dotColor: "text-teal-400 animate-ping",
  },
  THINKING: {
    symbol: "◉",
    label: "THINKING...",
    subtext: "Processing context & formulating response",
    textColor: "text-amber-300",
    dotColor: "text-amber-400 animate-pulse",
  },
  "JARVIS SPEAKING": {
    symbol: "◉",
    label: "JARVIS SPEAKING...",
    subtext: "Speak at any moment to interrupt naturally",
    textColor: "text-sky-300",
    dotColor: "text-sky-400 animate-pulse",
  },
  ERROR: {
    symbol: "▲",
    label: "ERROR",
    subtext: "Voice link interrupted",
    textColor: "text-red-400",
    dotColor: "text-red-500",
  },
};

export default function App() {
  const {
    systemState,
    errorCode,
    errorMessage,
    isMicMuted,
    needsUserGesture,
    transcripts,
    sampleAudioMetrics,
    unlockAndResumeAudio,
    reconnect,
    toggleMicMute,
    clearTranscripts,
    interruptJarvis,
  } = useJarvisLive();

  const [showTranscript, setShowTranscript] = useState<boolean>(true);

  const currentDisplay =
    STATE_DISPLAY_CONFIG[systemState] || STATE_DISPLAY_CONFIG.LISTENING;

  const handleCoreInteraction = () => {
    if (needsUserGesture || systemState === "ERROR") {
      unlockAndResumeAudio();
      return;
    }
    if (systemState === "JARVIS SPEAKING") {
      interruptJarvis();
    }
  };

  return (
    <div className="relative w-screen h-dvh bg-[#030712] text-slate-100 overflow-hidden select-none flex flex-col justify-between">
      {/* Subtle Architectural Grid & Vignette Backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(56, 189, 248, 0.14) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,#030712_90%)]" />

      {/* Full-Viewport 3D JARVIS Spatial Core */}
      <main className="absolute inset-0 z-0 w-full h-full">
        <JarvisCore3D
          systemState={systemState}
          sampleAudioMetrics={sampleAudioMetrics}
          onCoreClick={handleCoreInteraction}
        />
      </main>

      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (System Telemetry) — Zone 3 (Primary Actions) */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/5 bg-slate-950/30 backdrop-blur-sm">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          className="font-display text-lg sm:text-xl font-bold tracking-widest text-cyan-50"
        >
          J.A.R.V.I.S.
        </a>

        {/* Zone 2: Unboxed minimal metadata */}
        <div className="hidden md:flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span>Gemini 3.8 Live</span>
          <span aria-hidden="true">·</span>
          <span>Real-Time Duplex Audio</span>
          <span aria-hidden="true">·</span>
          <span>Auto Language Detection</span>
        </div>

        {/* Zone 3: 1-2 Primary Interactive Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowTranscript((prev) => !prev)}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              showTranscript
                ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-200"
                : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Toggle live transcript"
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </button>

          <button
            type="button"
            onClick={toggleMicMute}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              isMicMuted
                ? "bg-red-500/20 border-red-500/40 text-red-200 hover:bg-red-500/30"
                : "bg-cyan-500/20 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/30"
            }`}
            aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMicMuted ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-red-400" />
                <span>Mic Muted</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-cyan-300" />
                <span>Mic Active</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Bottom HUD: Live State Indicator, Audio Waveform, Error/Unlock Prompts & Optional Transcript */}
      <section className="relative z-10 w-full flex flex-col items-center justify-end pb-5 sm:pb-7 px-4 gap-3 pointer-events-none">
        {/* Browser Audio Unlock Banner (if browser suspended AudioContext before user gesture) */}
        {needsUserGesture && systemState !== "ERROR" && (
          <div className="pointer-events-auto max-w-md w-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/40 rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-cyan-100">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Tap once to activate real-time microphone &amp; voice output.</span>
            </div>
            <button
              type="button"
              onClick={unlockAndResumeAudio}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Initialize Audio
            </button>
          </div>
        )}

        {/* Explicit Error Handling Display */}
        {systemState === "ERROR" && errorMessage && (
          <div
            role="alert"
            className="pointer-events-auto max-w-lg w-full bg-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_35px_rgba(239,68,68,0.25)]"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-mono text-red-300">
                {errorCode === "MIC_PERMISSION_DENIED"
                  ? "MICROPHONE PERMISSION REQUIRED"
                  : errorCode === "MISSING_API_KEY"
                  ? "CONFIGURATION ERROR"
                  : "CONNECTION ERROR"}
              </p>
              <p className="text-sm font-medium text-red-100">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={reconnect}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-red-500/25 border border-red-400/50 text-red-100 hover:bg-red-500/35 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Optional Clean Conversation Transcript */}
        <TranscriptOverlay
          transcripts={transcripts}
          isOpen={showTranscript}
          onClear={clearTranscripts}
        />

        {/* Real-Time Synchronized Voice Waveform */}
        <AudioWaveform
          systemState={systemState}
          sampleAudioMetrics={sampleAudioMetrics}
        />

        {/* Primary Minimal System State Indicator */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex items-center gap-2.5 font-display text-base sm:text-lg font-semibold tracking-[0.18em]">
            <span className={currentDisplay.dotColor} aria-hidden="true">
              {currentDisplay.symbol}
            </span>
            <span className={currentDisplay.textColor}>
              {isMicMuted && systemState === "LISTENING"
                ? "MICROPHONE MUTED"
                : currentDisplay.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-md text-balance">
            {isMicMuted
              ? "Unmute microphone to resume hands-free voice conversation"
              : currentDisplay.subtext}
          </p>
        </div>
      </section>
    </div>
  );
}
