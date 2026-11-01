import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import {
  ProviderCallError,
  ProviderNotConfiguredError,
  looksConfigured,
  resolveMode,
  warnMock,
} from "./runtime";
import type { ChatGenerationResult, ChatMessage } from "./types";

const SYSTEM_PROMPT =
  "You are Vision, a concise assistant inside a creative AI studio. Help users turn ideas into images, music, and marketing assets. Answer in 1-3 short paragraphs and stay on creative work.";

const MAX_HISTORY = 12;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function recentHistory(history: ChatMessage[]): ChatMessage[] {
  return history
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_HISTORY);
}

async function groqReply(
  history: ChatMessage[],
  userMessage: string
): Promise<ChatGenerationResult> {
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY as string,
    baseURL: GROQ_BASE_URL,
  });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((message) => ({
          role: message.role === "system" ? "user" : message.role,
          content: message.content,
        })),
        { role: "user", content: userMessage },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new ProviderCallError("Groq returned an empty completion", "groq");
    }

    return { text, provider: "groq", model, mock: false };
  } catch (error) {
    if (error instanceof ProviderCallError) throw error;
    throw new ProviderCallError(
      `Groq chat request failed: ${error instanceof Error ? error.message : "unknown error"}`,
      "groq"
    );
  }
}

async function geminiReply(
  history: ChatMessage[],
  userMessage: string
): Promise<ChatGenerationResult> {
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [
        ...history.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        { role: "user", parts: [{ text: userMessage }] },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });

    const text = result.text?.trim();
    if (!text) {
      throw new ProviderCallError("Gemini returned an empty completion", "gemini");
    }

    return { text, provider: "gemini", model, mock: false };
  } catch (error) {
    if (error instanceof ProviderCallError) throw error;
    throw new ProviderCallError(
      `Gemini chat request failed: ${error instanceof Error ? error.message : "unknown error"}`,
      "gemini"
    );
  }
}

function mockReply(
  history: ChatMessage[],
  userMessage: string
): ChatGenerationResult {
  warnMock("chat");
  const turn = Math.floor(history.length / 2) + 1;
  const text = `[dev mock reply] Turn ${turn}: I received "${userMessage.slice(0, 180)}". The conversation pipeline, quota ledger, and history persistence are working. Add GROQ_API_KEY (or GEMINI_API_KEY) and set AI_MODE=live to get real model output.`;
  return { text, provider: "local", model: "mock-chat", mock: true };
}

export async function generateChatReply(
  history: ChatMessage[],
  userMessage: string
): Promise<ChatGenerationResult> {
  const cleanHistory = recentHistory(history);
  const groqReady = looksConfigured(process.env.GROQ_API_KEY);
  const geminiReady = looksConfigured(process.env.GEMINI_API_KEY);

  const mode = resolveMode(
    groqReady || geminiReady
      ? [process.env.GROQ_API_KEY ?? process.env.GEMINI_API_KEY]
      : [undefined]
  );

  if (mode === "mock") return mockReply(cleanHistory, userMessage);
  if (groqReady) return groqReply(cleanHistory, userMessage);
  if (geminiReady) return geminiReply(cleanHistory, userMessage);

  throw new ProviderNotConfiguredError(
    "Chat provider not configured: set GROQ_API_KEY or GEMINI_API_KEY"
  );
}
