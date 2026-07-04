import WebSocket from "ws";

import { getGradiumEnv } from "@/lib/env";

const GRADIUM_TTS_WS_URL = "wss://api.gradium.ai/api/speech/tts";
const CONNECTION_TIMEOUT_MS = 20_000;
/** Gradium's free tier caps a session at 1500 characters; stay well under it. */
const MAX_TEXT_LENGTH = 800;

type GradiumServerMessage =
  | { type: "ready"; request_id?: string }
  | { type: "audio"; audio: string }
  | { type: "text"; text: string }
  | { type: "end_of_stream" }
  | { type: "error"; message: string; code?: number };

/**
 * Synthesizes `text` into WAV audio via Gradium's TTS WebSocket API.
 * Protocol: connect → send `setup` → await `ready` → send `text` +
 * `end_of_stream` → collect base64 `audio` chunks until `end_of_stream`.
 * See https://docs.gradium.ai/api-reference/endpoint/tts-websocket
 *
 * Returns `null` (rather than throwing) when Gradium isn't configured, so
 * callers can treat TTS as an optional, non-blocking bonus feature per
 * PROJECT_PLAN.md's Gradium integration notes.
 */
export async function synthesizeSpeech(text: string): Promise<Buffer | null> {
  const { apiKey, voiceId } = getGradiumEnv();
  if (!apiKey) return null;

  const truncatedText = text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;

  return new Promise<Buffer>((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    let settled = false;

    const socket = new WebSocket(GRADIUM_TTS_WS_URL, {
      headers: { "x-api-key": apiKey },
    });

    const timeout = setTimeout(() => {
      finish(() => reject(new Error("Gradium TTS request timed out")));
    }, CONNECTION_TIMEOUT_MS);

    function finish(action: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.removeAllListeners();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      action();
    }

    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "setup",
          voice_id: voiceId,
          model_name: "default",
          output_format: "wav",
        })
      );
    });

    socket.on("message", (raw) => {
      let message: GradiumServerMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (message.type) {
        case "ready":
          socket.send(JSON.stringify({ type: "text", text: truncatedText }));
          socket.send(JSON.stringify({ type: "end_of_stream" }));
          break;
        case "audio":
          audioChunks.push(Buffer.from(message.audio, "base64"));
          break;
        case "end_of_stream":
          finish(() => resolve(Buffer.concat(audioChunks)));
          break;
        case "error":
          finish(() => reject(new Error(`Gradium TTS error: ${message.message}`)));
          break;
        default:
          break;
      }
    });

    socket.on("error", (err) => {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))));
    });

    socket.on("close", (code, reasonBuf) => {
      if (settled) return;
      const reason = reasonBuf?.toString() || `code ${code}`;
      finish(() => reject(new Error(`Gradium TTS connection closed unexpectedly (${reason})`)));
    });
  });
}
