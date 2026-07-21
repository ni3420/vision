import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { getAuth } from "@hono/clerk-auth"
import { Conversation } from "@/models/conversation.models"
import { CreateConversationSchema, PostMessageSchema } from "../schema"
import { generateConversationReply } from "@/gemini/conversation-ai"
import { User } from "@/models/user.models"
import { checkPlanLimit } from "@/middleware/freeUsesLimit-middleware"

const app = new Hono()
  // 1. FETCH ALL CONVERSATIONS FOR CURRENT USER
  .get("/all", async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const conversations = await Conversation.find({ userId: auth.userId })
        .select("sessionId messages createdAt updatedAt")
        .sort({ updatedAt: -1 })

      return c.json({ success: true, data: conversations }, 200)
    } catch (error: any) {
      console.error("Error fetching conversations:", error.message)
      return c.json({ success: false, error: "Failed to retrieve conversations" }, 500)
    }
  })

  // 2. FETCH A SPECIFIC SESSION'S MESSAGES
  .get("/:sessionId", async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const sessionId = c.req.param("sessionId")
      const conversation = await Conversation.findOne({
        sessionId,
        userId: auth.userId,
      })

      if (!conversation) {
        return c.json({ success: false, error: "Conversation session not found" }, 404)
      }

      return c.json({ success: true, data: conversation }, 200)
    } catch (error: any) {
      console.error("Error fetching session context:", error.message)
      return c.json({ success: false, error: "Failed to fetch session messages" }, 500)
    }
  })

  // 3. CREATE OR INITIALIZE A NEW SESSION (WITH AI INITIAL REPLY & USAGE COUNTING)
  .post("/session", checkPlanLimit, zValidator("json", CreateConversationSchema), async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const { sessionId, initialMessage } = c.req.valid("json")

      let conversation = await Conversation.findOne({ sessionId, userId: auth.userId })

      if (!conversation) {
        const initialMessages: Array<{ role: "user" | "assistant" | "system"; content: string; createdAt?: Date }> = []

        if (initialMessage) {
          initialMessages.push(initialMessage)

          // Generate AI reply for the initial message
          const aiReplyText = await generateConversationReply([], initialMessage.content)
          
          initialMessages.push({
            role: "assistant",
            content: aiReplyText,
            createdAt: new Date(),
          })

          // Increment free usage count after generating AI response
          await User.findOneAndUpdate(
            { userId: auth.userId },
            { $inc: { freeUsesCount: 1 } },
            { new: true }
          )
        }

        conversation = await Conversation.create({
          userId: auth.userId,
          sessionId,
          messages: initialMessages,
        })
      }

      return c.json({ success: true, data: conversation }, 201)
    } catch (error: any) {
      console.error("Error initializing session:", error.message)
      return c.json({ success: false, error: "Failed to create conversation session" }, 500)
    }
  })

  // 4. APPEND A NEW USER MESSAGE + GET AI REPLY (WITH PLAN LIMIT CHECK)
  .post("/message", checkPlanLimit, zValidator("json", PostMessageSchema), async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const { sessionId, message } = c.req.valid("json")

      // Fetch active chat context history
      const existingSession = await Conversation.findOne({ sessionId, userId: auth.userId })
      const history = existingSession?.messages || []

      // Generate AI response passing existing history and user prompt
      const aiReplyText = await generateConversationReply(history, message.content)

      const assistantMessage = {
        role: "assistant" as const,
        content: aiReplyText,
        createdAt: new Date(),
      }

      // Atomically push both user prompt and assistant response to DB
      const updatedConversation = await Conversation.findOneAndUpdate(
        { sessionId, userId: auth.userId },
        { 
          $push: { 
            messages: { 
              $each: [message, assistantMessage] 
            } 
          } 
        },
        { new: true, upsert: true }
      )

      // Increment free usage count for the user
      await User.findOneAndUpdate(
        { userId: auth.userId },
        { $inc: { freeUsesCount: 1 } },
        { new: true }
      )

      return c.json({ success: true, data: updatedConversation }, 200)
    } catch (error: any) {
      console.error("Error appending message and AI response:", error.message)
      return c.json({ success: false, error: "Failed to post message to session" }, 500)
    }
  })

  // 5. DELETE A CONVERSATION SESSION
  .delete("/:sessionId", async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const sessionId = c.req.param("sessionId")

      const deleted = await Conversation.findOneAndDelete({
        sessionId,
        userId: auth.userId,
      })

      if (!deleted) {
        return c.json({ success: false, error: "Conversation session not found" }, 404)
      }

      return c.json({ success: true, message: "Session deleted successfully" }, 200)
    } catch (error: any) {
      console.error("Error deleting conversation:", error.message)
      return c.json({ success: false, error: "Failed to delete session" }, 500)
    }
  })

export default app