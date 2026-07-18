import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import axios from "axios"

const imageGenerationSchema = z.object({
  prompt: z.string(),
  dimensions: z.string(), // e.g., "232*300"
  quantity: z.union([z.number(), z.string()]), // accepts "3" or 3
})

const app = new Hono()
  .post("/", zValidator("json", imageGenerationSchema), async (c) => {
    try {
      const { dimensions, prompt, quantity } = c.req.valid("json")
      
      // Ensure quantity is processed cleanly as an integer number
      const count = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity

      // Clean the dimension layout formatting if it uses '*'
      const formattedDimensions = dimensions.replace('*', 'x') 

      const structuralPrompt = `${prompt}, aspect ratio ${formattedDimensions}, high quality photorealistic`

      // 1. Create an array of tasks to execute requests concurrently
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
      );

      // 2. Fire all image requests at once to speed up performance
      const responses = await Promise.all(generationTasks);

      // 3. Convert all raw image payloads into individual base64 Data URLs
      const imageUrls = responses.map((res) => {
        const base64Image = Buffer.from(res.data).toString('base64');
        return `data:image/jpeg;base64,${base64Image}`;
      });

      // 4. Return the complete list back to Next.js
      return c.json({
        success: true,
        images: imageUrls // Sends back all 3 generated items array
      }, 200);

    } catch (error: any) {
      console.error("Hono Multi-Image Generation Error:", error.message)   
      return c.json({ success: false, error: error.message }, 500)
    }
  })

export default app