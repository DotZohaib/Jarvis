export type JarvisSystemState =
  | "CONNECTING"
  | "READY"
  | "LISTENING"
  | "USER SPEAKING"
  | "THINKING"
  | "JARVIS SPEAKING"
  | "ERROR";

export type JarvisErrorCode =
  | "MIC_PERMISSION_DENIED"
  | "GEMINI_CONNECTION_FAILED"
  | "MISSING_API_KEY"
  | "NETWORK_DISCONNECTED"
  | null;

export type JarvisVoiceName = "Charon" | "Fenrir" | "Zephyr" | "Puck" | "Kore";

export interface TranscriptEntry {
  id: string;
  role: "user" | "jarvis";
  text: string;
  timestamp: number;
  isComplete: boolean;
}

export interface AudioMetrics {
  /** Normalized 0..1 microphone RMS level */
  inputLevel: number;
  /** Normalized 0..1 speaker output RMS level */
  outputLevel: number;
  /** Normalized 0..1 active level (whichever is dominant) */
  activeLevel: number;
  /** Normalized 0..1 low-frequency energy */
  bass: number;
  /** Normalized 0..1 mid-frequency energy */
  mid: number;
  /** Normalized 0..1 high-frequency energy */
  treble: number;
  /** Raw 64-bin frequency spectrum (0..255) for 3D rings and bars */
  frequencyBins: Uint8Array;
  /** Raw 128-sample time-domain waveform (0..255, 128 = zero crossing) */
  timeDomainData: Uint8Array;
}
