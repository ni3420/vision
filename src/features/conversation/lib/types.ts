export interface ConversationMessage {
  _id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string | Date;
  provider?: string | null;
  model?: string | null;
  mock?: boolean;
}

export interface ConversationSession {
  sessionId: string;
  title?: string;
  messages: ConversationMessage[];
  updatedAt?: string | Date;
}

export interface ConversationSummary {
  sessionId: string;
  title: string;
  messageCount: number;
  preview: string;
  updatedAt: string | Date;
  lastMessageAt: string | Date;
}
