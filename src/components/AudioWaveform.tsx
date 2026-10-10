import React, { useEffect, useRef } from "react";
import { AudioMetrics, JarvisSystemState } from "../types/jarvis";

interface AudioWaveformProps {
  systemState: JarvisSystemState;
  sampleAudioMetrics: () => AudioMetrics;
}

const WAVE_COLORS: Record<
  JarvisSystemState,
  { stroke: string; glow: string; bar: string }
> = {
  CONNECTING: {
    stroke: "rgba(148, 163, 184, 0.5)",
    glow: "rgba(56, 189, 248, 0.25)",
    bar: "rgba(148, 163, 184, 0.35)",
  },
  READY: {
    stroke: "rgba(6, 182, 212, 0.75)",
    glow: "rgba(6, 182, 212, 0.35)",
    bar: "rgba(34, 211, 238, 0.45)",
  },
  LISTENING: {
    stroke: "rgba(34, 211, 238, 0.85)",
    glow: "rgba(6, 182, 212, 0.4)",
    bar: "rgba(34, 211, 238, 0.55)",
  },
  "USER SPEAKING": {
    stroke: "rgba(45, 212, 191, 0.95)",
    glow: "rgba(20, 184, 166, 0.65)",
    bar: "rgba(45, 212, 191, 0.85)",
  },
  THINKING: {
    stroke: "rgba(251, 191, 36, 0.9)",
    glow: "rgba(245, 158, 11, 0.55)",
    bar: "rgba(251, 191, 36, 0.75)",
  },
  "JARVIS SPEAKING": {
    stroke: "rgba(56, 189, 248, 0.98)",
    glow: "rgba(14, 165, 233, 0.75)",
    bar: "rgba(103, 232, 249, 0.9)",
  },
  ERROR: {
    stroke: "rgba(248, 113, 113, 0.8)",
    glow: "rgba(239, 68, 68, 0.4)",
    bar: "rgba(248, 113, 113, 0.5)",
  },
};

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  systemState,
  sampleAudioMetrics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<JarvisSystemState>(systemState);

  useEffect(() => {
    stateRef.current = systemState;
  }, [systemState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const currentState = stateRef.current;
      const colors = WAVE_COLORS[currentState] || WAVE_COLORS.LISTENING;
      const metrics = sampleAudioMetrics();
      const centerY = height / 2;

      phase += currentState === "THINKING" ? 0.11 : 0.045 + metrics.activeLevel * 0.14;

      // 1. Symmetric Mirrored Frequency Bars in Center
      const numBars = 36;
      const totalBarWidth = Math.min(width * 0.82, 340);
      const startX = (width - totalBarWidth) / 2;
      const stepX = totalBarWidth / numBars;
      const barWidth = Math.max(2, stepX * 0.46);

      ctx.fillStyle = colors.bar;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 10;

      for (let i = 0; i < numBars; i++) {
        // Mirror from center outward so low/mid vocal frequencies sit at the center
        const distFromCenter = Math.abs(i - (numBars - 1) / 2) / (numBars / 2);
        const binIndex = Math.min(
          63,
          Math.floor(distFromCenter * 38)
        );
        const rawBin = metrics.frequencyBins[binIndex] / 255.0;
        const envelope = Math.cos(distFromCenter * Math.PI * 0.48);

        let barHeight = 2.5;
        if (currentState === "THINKING") {
          const thinkWave =
            Math.sin(phase * 1.8 + distFromCenter * 5.0) * 0.5 + 0.5;
          barHeight = 3 + thinkWave * 16 * envelope;
        } else {
          const idleBreath =
            (Math.sin(phase + i * 0.35) * 0.5 + 0.5) * 2.5 * envelope;
          barHeight = Math.max(
            2.5,
            idleBreath + rawBin * (height * 0.78) * envelope
          );
        }

        const x = startX + i * stepX + (stepX - barWidth) / 2;
        const y = centerY - barHeight / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      // 2. Continuous Oscilloscope Time-Domain Wave Overlay
      ctx.beginPath();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 8;

      const timeData = metrics.timeDomainData;
      const sliceWidth = width / (timeData.length - 1);

      for (let i = 0; i < timeData.length; i++) {
        const x = i * sliceWidth;
        const normalizedX = (i / (timeData.length - 1)) * 2 - 1; // -1..1
        const windowAttenuation = Math.max(0, 1 - normalizedX * normalizedX);

        const sample = (timeData[i] - 128) / 128.0; // -1..1
        const syntheticIdle =
          Math.sin(phase * 1.3 + i * 0.12) *
          (currentState === "THINKING" ? 0.22 : 0.045);

        const yOffset =
          (sample * 0.85 + syntheticIdle) * (height * 0.44) * windowAttenuation;
        const y = centerY + yOffset;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.restore();
      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [sampleAudioMetrics]);

  return (
    <div className="w-full max-w-md h-12 sm:h-14 flex items-center justify-center pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
    </div>
  );
};
