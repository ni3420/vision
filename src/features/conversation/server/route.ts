import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@clerk/hono";
import { Conversation, type MessageType } from "@/models/conversation.models";
import {
  CreateConversationSchema,
  PostMessageSchema,
  RenameConversationSchema,
} from "../schema";
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
import {
  checkRateLimit,
  rateLimitGuard,
} from "@/middleware/rate-limit-middleware";
import type { Context } from "hono";
import type { ChatMessage } from "@/server/ai/types";

const MODEL_HISTORY_LIMIT = 12;
const LIST_DEFAULT_LIMIT = 50;
const LIST_MAX_LIMIT = 100;

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
    return c.json(
      {
        success: false,
        code: error.code,
        error: error.message,
        retryable: error.retryable,
      },
      502
    );
  }

  console.error(`${fallbackMessage}:`, error);
  return c.json(
    { success: false, code: "CONVERSATION_ERROR", error: fallbackMessage },
    500
  );
}

function toChatHistory(messages: MessageType[]): ChatMessage[] {
  return messages
    .slice(-MODEL_HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content }));
}

function toReplyMetadata(message: unknown) {
  const source = message as MessageType & { _id?: { toString(): string } };
  return {
    id: source?._id?.toString() ?? null,
    provider: source?.provider ?? null,
    model: source?.model ?? null,
    mock: source?.mock ?? false,
  };
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw ?? LIST_DEFAULT_LIMIT);
  if (!Number.isFinite(value)) return LIST_DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(value), 1), LIST_MAX_LIMIT);
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

      const limit = parseLimit(c.req.query("limit"));
      const conversations = await Conversation.find({ userId: auth.userId })
        .select("sessionId title messages updatedAt")
        .sort({ updatedAt: -1 })
        .limit(limit);

      const data = conversations.map((conversation) => {
        const messages: MessageType[] = conversation.messages ?? [];
        const firstUser = messages.find((message) => message.role === "user");
        const last = messages[messages.length - 1];

        return {
          sessionId: conversation.sessionId,
          title:
            conversation.title?.trim() ||
            firstUser?.content.trim().slice(0, 120) ||
            "New conversation",
          messageCount: messages.length,
          preview: (last?.content ?? "").trim().slice(0, 140),
          updatedAt: conversation.updatedAt,
          lastMessageAt:
            last?.createdAt ?? conversation.updatedAt,
        };
      });

      return c.json({ success: true, data }, 200);
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

  // 3. CREATE A NEW SESSION (CHARGED ONLY WHEN AN INITIAL MESSAGE IS GENERATED)
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

        const { sessionId: requestedSessionId, initialMessage } = c.req.valid("json");
        const sessionId = requestedSessionId ?? `session_${randomUUID()}`;

        const existing = await Conversation.findOne({
          sessionId,
          userId: auth.userId,
        });

        if (existing) {
          const last = existing.messages?.[existing.messages.length - 1];
          return c.json(
            {
              success: true,
              data: existing,
              mock: last?.mock ?? false,
              provider: last?.provider ?? null,
              model: last?.model ?? null,
            },
            201
          );
        }

        if (!initialMessage) {
          const conversation = await Conversation.create({
            userId: auth.userId,
            sessionId,
            messages: [],
          });

          return c.json(
            {
              success: true,
              data: conversation,
              mock: false,
              provider: null,
              model: null,
            },
            201
          );
        }

        const limit = await checkRateLimit(c, "conversation");
        if (!limit.allowed) return c.json(limit.body, limit.status);

        const { value } = await runWithQuota(
          {
            userId: auth.userId,
            kind: "conversation",
            reason: "session-initial-message",
            idempotencyKey: c.req.header("idempotency-key")?.trim() || undefined,
          },
          async () => {
            const reply = await generateChatReply([], initialMessage.content);
            const created = await Conversation.create({
              userId: auth.userId,
              sessionId,
              messages: [
                { role: "user", content: initialMessage.content, createdAt: new Date() },
                {
                  role: "assistant",
                  content: reply.text,
                  createdAt: new Date(),
                  provider: reply.provider,
                  model: reply.model,
                  mock: reply.mock,
                },
              ],
            });

            return { created, reply };
          }
        );

        const reply = toReplyMetadata(
          value.created.messages[value.created.messages.length - 1]
        );

        return c.json(
          {
            success: true,
            data: value.created,
            mock: reply.mock,
            provider: reply.provider,
            model: reply.model,
          },
          201
        );
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
    zValidator("json", PostMessageSchema),
    rateLimitGuard("conversation"),
    quotaGuard("conversation"),
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

        if (!existingSession) {
          return c.json(
            {
              success: false,
              code: "SESSION_NOT_FOUND",
              error: "Conversation session not found",
            },
            404
          );
        }

        const reply = await generateChatReply(
          toChatHistory(existingSession.messages ?? []),
          message.content
        );

        const updatedConversation = await Conversation.findOneAndUpdate(
          { sessionId, userId: auth.userId },
          {
            $push: {
              messages: {
                $each: [
                  {
                    role: "user",
                    content: message.content,
                    createdAt: new Date(),
                  },
                  {
                    role: "assistant",
                    content: reply.text,
                    createdAt: new Date(),
                    provider: reply.provider,
                    model: reply.model,
                    mock: reply.mock,
                  },
                ],
              },
            },
          },
          { new: true }
        );

        const lastMessage = updatedConversation
          ? updatedConversation.messages[updatedConversation.messages.length - 1]
          : undefined;

        return c.json(
          {
            success: true,
            data: updatedConversation,
            mock: reply.mock,
            reply: toReplyMetadata(lastMessage),
          },
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

  // 5. RENAME A CONVERSATION
  .patch(
    "/:sessionId",
    zValidator("json", RenameConversationSchema),
    async (c) => {
      try {
        const auth = getAuth(c);
        if (!auth || !auth.userId) {
          return c.json(
            { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
            401
          );
        }

        const sessionId = c.req.param("sessionId");
        const { title } = c.req.valid("json");

        const updated = await Conversation.findOneAndUpdate(
          { sessionId, userId: auth.userId },
          { $set: { title } },
          { new: true }
        );

        if (!updated) {
          return c.json(
            { success: false, code: "SESSION_NOT_FOUND", error: "Conversation session not found" },
            404
          );
        }

        return c.json(
          { success: true, data: { sessionId, title: updated.title } },
          200
        );
      } catch (error) {
        console.error("Error renaming conversation:", error);
        return c.json(
          { success: false, code: "SESSION_RENAME_FAILED", error: "Failed to rename session" },
          500
        );
      }
    }
  )

  // 6. DELETE A CONVERSATION SESSION
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
