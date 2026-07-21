import { z } from "zod";

// Base schema for individual message objects
export const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"], {
    required_error: "Message role is required",
  }),
  content: z.string().min(1, "Message content cannot be empty"),
  createdAt: z.date().optional(),
});

// Main conversation document validation schema
export const ConversationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  messages: z.array(MessageSchema).default([]),
});

// Payload schema for creating a new conversation session
export const CreateConversationSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  initialMessage: MessageSchema.optional(),
});

// Payload schema for pushing a new message to an existing session
export const PostMessageSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  message: MessageSchema,
});

export type MessageInput = z.infer<typeof MessageSchema>;
export type ConversationInput = z.infer<typeof ConversationSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type PostMessageInput = z.infer<typeof PostMessageSchema>;