import { z } from "zod";

export const SESSION_ID_PATTERN = /^session_[A-Za-z0-9-]{8,64}$/;

const MAX_MESSAGE_LENGTH = 4000;

// Users may only author user turns. Assistant/system messages are written by
// the server, so a client-supplied role other than "user" is rejected.
export const CreateConversationSchema = z.object({
  sessionId: z
    .string()
    .regex(SESSION_ID_PATTERN, "Invalid session ID")
    .optional(),
  initialMessage: z
    .object({
      content: z
        .string()
        .trim()
        .min(1, "Message content cannot be empty")
        .max(MAX_MESSAGE_LENGTH, `Message content must be ${MAX_MESSAGE_LENGTH} characters or fewer`),
    })
    .optional(),
});

export const PostMessageSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  message: z.object({
    role: z.literal("user", { message: "Only user messages can be posted" }).optional(),
    content: z
      .string()
      .trim()
      .min(1, "Message content cannot be empty")
      .max(MAX_MESSAGE_LENGTH, `Message content must be ${MAX_MESSAGE_LENGTH} characters or fewer`),
  }),
});

export const RenameConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(80, "Title must be 80 characters or fewer"),
});

export type MessageInput = z.infer<typeof PostMessageSchema>["message"];
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type PostMessageInput = z.infer<typeof PostMessageSchema>;
export type RenameConversationInput = z.infer<typeof RenameConversationSchema>;
