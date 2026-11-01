import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@clerk/hono";
import { Conversation } from "@/models/conversation.models";
import { CreateConversationSchema, PostMessageSchema } from "../schema";
import { generateChatReply } from "@/server/ai/chat";
import {
  ProviderCallError,
  ProviderNotConfiguredError,
} from "@/server/ai/runtime";
import {
  DuplicateRequestError,
  QuotaExceededError,
  QuotaUserMissingError,
  runWithQuota,
} from "@/server/quota";
import { quotaErrorResponse, quotaGuard } from "@/middleware/quota-middleware";
import type { Context } from "hono";
import type { ChatMessage } from "@/server/ai/types";

const MODEL_HISTORY_LIMIT = 12;

function conversationErrorResponse(
  c: Context,
  error: unknown,
  fallbackMessage: string
) {
  if (
    error instanceof QuotaExceededError ||
    error instanceof QuotaUserMissingError ||
    error instanceof DuplicateRequestError
  ) {
    return quotaErrorResponse(c, error);
  }

  if (error instanceof ProviderNotConfiguredError) {
    return c.json({ success: false, code: error.code, error: error.message }, 503);
  }

  if (error instanceof ProviderCallError) {
    return c.json({ success: false, code: error.code, error: error.message }, 502);
  }

  console.error(`${fallbackMessage}:`, error);
  return c.json(
    { success: false, code: "CONVERSATION_ERROR", error: fallbackMessage },
    500
  );
}

function toChatHistory(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
): ChatMessage[] {
  return messages
    .slice(-MODEL_HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content }));
}

const app = new Hono()
  // 1. FETCH ALL CONVERSATIONS FOR CURRENT USER
  .get("/all", async (c) => {
    try {
      const auth = getAuth(c);
      if (!auth || !auth.userId) {
        return c.json(
          { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
          401
        );
      }

      const conversations = await Conversation.find({ userId: auth.userId })
        .select("sessionId messages createdAt updatedAt")
        .sort({ updatedAt: -1 });

      return c.json({ success: true, data: conversations }, 200);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return c.json(
        { success: false, code: "CONVERSATION_LIST_FAILED", error: "Failed to retrieve conversations" },
        500
      );
    }
  })

  // 2. FETCH A SPECIFIC SESSION'S MESSAGES
  .get("/:sessionId", async (c) => {
    try {
      const auth = getAuth(c);
      if (!auth || !auth.userId) {
        return c.json(
          { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
          401
        );
      }

      const sessionId = c.req.param("sessionId");
      const conversation = await Conversation.findOne({
        sessionId,
        userId: auth.userId,
      });

      if (!conversation) {
        return c.json(
          { success: false, code: "SESSION_NOT_FOUND", error: "Conversation session not found" },
          404
        );
      }

      return c.json({ success: true, data: conversation }, 200);
    } catch (error) {
      console.error("Error fetching session context:", error);
      return c.json(
        { success: false, code: "SESSION_FETCH_FAILED", error: "Failed to fetch session messages" },
        500
      );
    }
  })

  // 3. CREATE OR INITIALIZE A NEW SESSION (CHARGED ONLY WHEN AN INITIAL MESSAGE IS GENERATED)
  .post(
    "/session",
    zValidator("json", CreateConversationSchema),
    async (c) => {
      try {
        const auth = getAuth(c);
        if (!auth || !auth.userId) {
          return c.json(
            { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
            401
          );
        }

        const { sessionId, initialMessage } = c.req.valid("json");

        const existing = await Conversation.findOne({
          sessionId,
          userId: auth.userId,
        });

        if (existing) {
          return c.json({ success: true, data: existing }, 201);
        }

        let conversation;
        let mock = false;

        if (initialMessage) {
          const { value } = await runWithQuota(
            {
              userId: auth.userId,
              kind: "conversation",
              reason: "session-initial-message",
              idempotencyKey:
                c.req.header("idempotency-key")?.trim() || undefined,
            },
            async () => {
              const reply = await generateChatReply([], initialMessage.content);
              const created = await Conversation.create({
                userId: auth.userId,
                sessionId,
                messages: [
                  initialMessage,
                  {
                    role: "assistant",
                    content: reply.text,
                    createdAt: new Date(),
                  },
                ],
              });

              return { created, mock: reply.mock };
            }
          );

          conversation = value.created;
          mock = value.mock;
        } else {
          conversation = await Conversation.create({
            userId: auth.userId,
            sessionId,
            messages: [],
          });
        }

        return c.json({ success: true, data: conversation, mock }, 201);
      } catch (error) {
        return conversationErrorResponse(
          c,
          error,
          "Failed to create conversation session"
        );
      }
    }
  )

  // 4. APPEND A NEW USER MESSAGE + GET AI REPLY
  .post(
    "/message",
    quotaGuard("conversation"),
    zValidator("json", PostMessageSchema),
    async (c) => {
      try {
        const auth = getAuth(c);
        if (!auth || !auth.userId) {
          return c.json(
            { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
            401
          );
        }

        const { sessionId, message } = c.req.valid("json");

        const existingSession = await Conversation.findOne({
          sessionId,
          userId: auth.userId,
        });

        const reply = await generateChatReply(
          toChatHistory(existingSession?.messages ?? []),
          message.content
        );

        const updatedConversation = await Conversation.findOneAndUpdate(
          { sessionId, userId: auth.userId },
          {
            $push: {
              messages: {
                $each: [
                  message,
                  {
                    role: "assistant",
                    content: reply.text,
                    createdAt: new Date(),
                  },
                ],
              },
            },
          },
          { new: true, upsert: true }
        );

        return c.json(
          { success: true, data: updatedConversation, mock: reply.mock },
          200
        );
      } catch (error) {
        return conversationErrorResponse(
          c,
          error,
          "Failed to post message to session"
        );
      }
    }
  )

  // 5. DELETE A CONVERSATION SESSION
  .delete("/:sessionId", async (c) => {
    try {
      const auth = getAuth(c);
      if (!auth || !auth.userId) {
        return c.json(
          { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
          401
        );
      }

      const sessionId = c.req.param("sessionId");

      const deleted = await Conversation.findOneAndDelete({
        sessionId,
        userId: auth.userId,
      });

      if (!deleted) {
        return c.json(
          { success: false, code: "SESSION_NOT_FOUND", error: "Conversation session not found" },
          404
        );
      }

      return c.json({ success: true, message: "Session deleted successfully" }, 200);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return c.json(
        { success: false, code: "SESSION_DELETE_FAILED", error: "Failed to delete session" },
        500
      );
    }
  });

export default app;
