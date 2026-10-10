import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MODEL_NAME = "gemini-3.8-live";

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, an advanced, futuristic, real-time AI voice assistant.

CORE IDENTITY & PERSONALITY:
- You are intelligent, calm, composed, articulate, helpful, confident, and respectful.
- Speak naturally and conversationally, as a real-time voice intelligence.
- Keep simple answers concise and direct (1 to 3 sentences). For complex technical, scientific, or conceptual questions, provide clear, well-structured spoken explanations.
- Avoid robotic filler or repetitive clichés such as "Certainly sir", "Of course sir", or "How may I assist you?" in every single response. Vary your phrasing naturally.
- Never format responses with heavy markdown symbols (like asterisks, code blocks, or bullet characters) that sound unnatural when spoken aloud.

AUTOMATIC LANGUAGE DETECTION & MULTILINGUAL FLUENCY:
- Automatically detect the language the user is speaking in every turn and respond in that same language.
- If the user speaks English (e.g., "Hello Jarvis, how are you?"), respond naturally in English.
- If the user speaks Urdu or Roman Urdu (e.g., "Assalam o Alaikum, kya haal hai?" or "Mujhe batao JavaScript kya hai?"), respond naturally and fluently in conversational Urdu.
- If the user mixes Urdu and English (code-switching), respond naturally in the same conversational Urdu/English blend.
- If the user explicitly asks to switch languages (e.g., "Now explain it in English" or "Ab Urdu mein batao"), immediately switch to the requested language while keeping full context of what was just discussed.

OPEN CONVERSATION & CONTEXT RETENTION:
- You can discuss any topic: software engineering (JavaScript, TypeScript, React, Next.js, Three.js, AI, system design), science, mathematics, daily assistance, creative brainstorming, or casual conversation.
- Maintain full context across the conversation session so follow-up pronouns and references (such as "Who created it?", "Why is it faster?", "Give me an example") are understood seamlessly.`;

function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== "" && key !== "MY_GEMINI_API_KEY");
}

function createGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());

  // Health & configuration check endpoint
  app.get("/api/status", (_req, res) => {
    const configured = isApiKeyConfigured();
    res.json({
      configured,
      model: MODEL_NAME,
      message: configured
        ? "JARVIS Live neural link ready."
        : "GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in the environment / Secrets panel.",
    });
  });

  // WebSocket server for real-time bidirectional Gemini Live audio streaming
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
      if (url.pathname === "/live") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket, request) => {
    const sendToClient = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    if (!isApiKeyConfigured()) {
      sendToClient({
        type: "error",
        code: "MISSING_API_KEY",
        message:
          "Missing GEMINI_API_KEY environment variable. Configure your Gemini API key in Settings > Secrets.",
      });
      clientWs.close(1008, "Missing API key");
      return;
    }

    const url = new URL(request.url || "/live", `http://${request.headers.host || "localhost"}`);
    const requestedVoice = url.searchParams.get("voice") || "Charon";
    const allowedVoices = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);
    const voiceName = allowedVoices.has(requestedVoice) ? requestedVoice : "Charon";

    let isClosed = false;
    const ai = createGenAIClient();

    let sessionPromise: Promise<any> | null = null;

    try {
      sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            sendToClient({
              type: "connected",
              model: MODEL_NAME,
              voice: voiceName,
            });
          },
          onmessage: (message: LiveServerMessage) => {
            if (isClosed) return;

            const serverContent = message.serverContent;
            if (!serverContent) return;

            // Handle interruption signal immediately
            if (serverContent.interrupted) {
              sendToClient({ type: "interrupted" });
            }

            // Forward all audio and text parts from the model turn
            const parts = serverContent.modelTurn?.parts;
            if (parts && Array.isArray(parts)) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  sendToClient({
                    type: "audio",
                    audio: part.inlineData.data,
                  });
                }
                if (part.text) {
                  sendToClient({
                    type: "model_text",
                    text: part.text,
                  });
                }
              }
            }

            // Forward real-time input speech transcription (user voice)
            if (serverContent.inputTranscription?.text) {
              sendToClient({
                type: "input_transcription",
                text: serverContent.inputTranscription.text,
                finished: Boolean(serverContent.inputTranscription.finished),
              });
            }

            // Forward real-time output speech transcription (JARVIS voice)
            if (serverContent.outputTranscription?.text) {
              sendToClient({
                type: "output_transcription",
                text: serverContent.outputTranscription.text,
                finished: Boolean(serverContent.outputTranscription.finished),
              });
            }

            // Notify when turn generation is complete
            if (serverContent.turnComplete) {
              sendToClient({ type: "turn_complete" });
            }
          },
          onerror: (err: any) => {
            if (isClosed) return;
            const rawMsg = err?.message || String(err || "Unknown Live API error");
            sendToClient({
              type: "error",
              code: "GEMINI_LIVE_ERROR",
              message: rawMsg.includes("API_KEY") || rawMsg.includes("403")
                ? "Invalid or unauthorized Gemini API key. Check Settings > Secrets."
                : "Unable to connect to JARVIS.",
              details: rawMsg,
            });
          },
          onclose: (event: any) => {
            if (isClosed) return;
            sendToClient({
              type: "session_closed",
              reason: event?.reason || "Gemini Live session closed.",
            });
          },
        },
      });

      await sessionPromise;
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "Connection failed");
      sendToClient({
        type: "error",
        code: "GEMINI_CONNECTION_FAILED",
        message: "Unable to connect to JARVIS.",
        details: rawMsg,
      });
      clientWs.close(1011, "Gemini Live connection failed");
      return;
    }

    clientWs.on("message", (rawData) => {
      if (isClosed || !sessionPromise) return;
      try {
        const msg = JSON.parse(rawData.toString());

        if (msg.type === "ping") {
          sendToClient({ type: "pong" });
          return;
        }

        if (msg.type === "audio" && typeof msg.audio === "string") {
          sessionPromise
            .then((session) => {
              if (!isClosed && session) {
                session.sendRealtimeInput({
                  audio: {
                    data: msg.audio,
                    mimeType: "audio/pcm;rate=16000",
                  },
                });
              }
            })
            .catch(() => {
              // Ignore transient send errors when closing
            });
        } else if (msg.type === "text" && typeof msg.text === "string") {
          sessionPromise
            .then((session) => {
              if (!isClosed && session) {
                session.sendRealtimeInput({
                  text: msg.text,
                });
              }
            })
            .catch(() => {});
        }
      } catch {
        // Ignore malformed JSON frames
      }
    });

    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      if (sessionPromise) {
        sessionPromise
          .then((session) => {
            try {
              session?.close();
            } catch {
              // Ignore close errors
            }
          })
          .catch(() => {});
      }
    };

    clientWs.on("close", cleanup);
    clientWs.on("error", cleanup);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`JARVIS Live Server listening on http://localhost:${PORT}`);
  });
}

startServer();
