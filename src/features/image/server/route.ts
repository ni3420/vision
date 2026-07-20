import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import axios from "axios"
import { imageGenerationSchema } from "../schema"
import Image from "@/models/image.models"
import { getAuth } from "@clerk/hono"
import {checkPlanLimit} from "@/middleware/freeUsesLimit-middleware"
import { User } from "@/models/user.models"
const app = new Hono()
  .post("/", checkPlanLimit,zValidator("json", imageGenerationSchema), async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }
      const { userId } = auth

      const { dimensions, prompt, quantity } = c.req.valid("json")
      
      const count = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity
      const formattedDimensions = dimensions.replace('*', 'x') 
      const structuralPrompt = `${prompt}, aspect ratio ${formattedDimensions}, high quality photorealistic`

      const generationTasks = Array.from({ length: count }).map(() => 
        axios({
          method: "POST",
          url: process.env.CLOUDFARE_URL,
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFARE_API_KEY}`,
            "Content-Type": "application/json"
          },
          data: { prompt: structuralPrompt },
          responseType: "arraybuffer"
        })
      )

      const responses = await Promise.all(generationTasks)

      const imageUrls = responses.map((res) => {
        const base64Image = Buffer.from(res.data).toString('base64')
        return `data:image/jpeg;base64,${base64Image}`
      })

      await Image.findOneAndUpdate(
        { userId: userId },
        { 
          $push: { 
            Images: { $each: imageUrls } 
          } 
        },
        { upsert: true, new: true }
      )

      await User.findOneAndUpdate(
  { userId: userId },
  { $inc: { freeUsesCount: count } },
  { new: true }
)
      return c.json({
        success: true,
        images: imageUrls
      }, 200)

    } catch (error: any) {
      console.error("Hono Multi-Image Generation Error:", error.message)   
      return c.json({ success: false, error: error.message }, 500)
    }
  })
  .get("/history", async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth || !auth.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }
      const { userId } = auth

      const imageHistory = await Image.findOne({ userId })
      if (!imageHistory) {
        return c.json({
          success: true,
          images: [],
          message: "No generation history found matching this workspace signature"
        }, 200)
      }

      return c.json({
        success: true,
        images: imageHistory.Images,
        message: "Image history array synchronized successfully"
      }, 200)
      
    } catch (error: any) {
      console.error("Hono History Ingestion Error:", error.message)
      return c.json({ success: false, error: error.message }, 500)
    }
  })

export default app