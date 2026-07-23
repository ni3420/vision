import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { getAuth } from "@hono/clerk-auth"
import axios from "axios"
import { Music } from "@/models/music.models"
import { User } from "@/models/user.models"
import { checkPlanLimit } from "@/middleware/freeUsesLimit-middleware"
import { GenerateMusicSchema } from "../schema"

const TREBLO_API_KEY = process.env.TREBLO_API_KEY!
const TREBLO_BASE_URL = "https://api.treblo.com/v1/generations"

const trebloClient = axios.create({
  baseURL: TREBLO_BASE_URL,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${TREBLO_API_KEY}`,
    "Content-Type": "application/json",
  },
})

const app = new Hono()

  // 1. FETCH MUSIC GENERATION HISTORY FOR CURRENT USER
  .get("/history", async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth?.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const history = await Music.find({ userId: auth.userId }).sort({ createdAt: -1 })
      return c.json({ success: true, data: history }, 200)
    } catch (error: any) {
      console.error("Error fetching music history:", error.message)
      return c.json({ success: false, error: "Failed to retrieve music history" }, 500)
    }
  })

  // 2. GENERATE NEW MUSIC TRACK (POLLING FLOW)
  .post("/generate", checkPlanLimit, zValidator("json", GenerateMusicSchema), async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth?.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const { prompt, duration } = c.req.valid("json")

      // Step 1: Start Treblo music generation task
      const startResponse = await trebloClient.post("/v3", { prompt })
      const taskId = startResponse.data?.task_id || startResponse.data?.id

      if (!taskId) {
        return c.json({ success: false, error: "Failed to initialize generation task" }, 500)
      }

      // Step 2: Poll status until task completes or times out
      let completed = false
      let attempts = 0
      const maxAttempts = 20 // 20 * 5s = 100s max

      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++

        const statusResponse = await trebloClient.get(`/status/${taskId}`)
        
        // FIX: Treat response body directly as trimmed, uppercase string
        const rawStatus = String(statusResponse.data).trim().toUpperCase()
        console.log(`[Attempt ${attempts}/${maxAttempts}] Generation Status: ${rawStatus}`)

        if (rawStatus === "SUCCESS" || rawStatus === "COMPLETED") {
          completed = true
        } else if (rawStatus === "FAILED" || rawStatus === "FAILURE" || rawStatus === "ERROR") {
          throw new Error("Music generation engine encountered a failure")
        }
      }

      if (!completed) {
        return c.json({ success: false, error: "Music generation request timed out" }, 504)
      }

      // Step 3: Fetch generated audio details
      const resultResponse = await trebloClient.get(`/${taskId}`)
      const audioUrl = resultResponse.data?.song_paths?.[0] || resultResponse.data?.audio_url

      if (!audioUrl) {
        return c.json({ success: false, error: "Audio file path was not returned" }, 500)
      }

      // Save to MongoDB history
      const track = await Music.create({
        userId: auth.userId,
        prompt,
        audioUrl,
        duration: duration || 15,
      })

      // Deduct/increment user's free usage count
      await User.findOneAndUpdate(
        { userId: auth.userId },
        { $inc: { freeUsesCount: 1 } },
        { new: true }
      )

      return c.json({ success: true, data: track }, 201)
    } catch (error: any) {
      console.error("Music generation pipeline error:", error.response?.data || error.message)
      return c.json({ success: false, error: "Failed to generate track from audio engine" }, 500)
    }
  })

export default app