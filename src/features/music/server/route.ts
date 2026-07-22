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

const app = new Hono()
  // 1. FETCH MUSIC GENERATION HISTORY FOR CURRENT USER
  .get("/history", async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const history = await Music.find({ userId: auth.userId })
        .sort({ createdAt: -1 })

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
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const { prompt, duration } = c.req.valid("json")

      // Step 1: Start Treblo music generation task
      const startResponse = await axios.post(
        `${TREBLO_BASE_URL}/v3`,
        { prompt },
        {
          headers: {
            Authorization: `Bearer ${TREBLO_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      )

      const taskId = startResponse.data.task_id
      if (!taskId) {
        return c.json({ success: false, error: "Failed to initialize generation task" }, 500)
      }

      // Step 2: Poll status until task completes or times out
      let completed = false
      let attempts = 0
      const maxAttempts = 30 // ~2.5 minutes timeout limit (30 * 5s)

      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++

        const statusResponse = await axios.get(
          `${TREBLO_BASE_URL}/status/${taskId}`,
          {
            headers: { Authorization: `Bearer ${TREBLO_API_KEY}` },
          }
        )

        const status = statusResponse.data.status

        if (status === "SUCCESS") {
          completed = true
        } else if (status === "FAILURE") {
          throw new Error("Music generation engine encountered a failure")
        }
      }

      if (!completed) {
        return c.json({ success: false, error: "Music generation request timed out" }, 504)
      }

      // Step 3: Fetch generated audio details
      const resultResponse = await axios.get(
        `${TREBLO_BASE_URL}/${taskId}`,
        {
          headers: { Authorization: `Bearer ${TREBLO_API_KEY}` },
        }
      )

      const audioUrl = resultResponse.data.song_paths?.[0]
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