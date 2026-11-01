export type EffectiveMode = "live" | "mock";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  width: number;
  height: number;
}

export interface ImageGenerationResult {
  bytes: Buffer;
  mime: string;
  width: number;
  height: number;
  provider: string;
  model: string;
  mock: boolean;
}

export interface ChatGenerationResult {
  text: string;
  provider: string;
  model: string;
  mock: boolean;
}

export interface MusicGenerationRequest {
  prompt: string;
  durationSec: number;
}

export interface MusicGenerationResult {
  bytes: Buffer;
  mime: string;
  durationSec: number;
  provider: string;
  model: string;
  mock: boolean;
}
