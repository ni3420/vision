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

export interface BackgroundRemovalRequest {
  bytes: Buffer;
  mime: string;
  filename: string;
}

export interface BackgroundRemovalResult {
  bytes: Buffer;
  mime: string;
  width?: number;
  height?: number;
  provider: string;
  model: string;
  mock: boolean;
}
