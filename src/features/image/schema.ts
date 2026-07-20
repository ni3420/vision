import z from "zod";

export const imageGenerationSchema = z.object({
  prompt: z.string(),
  dimensions: z.string(), // e.g., "232*300"
  quantity: z.union([z.number(), z.string()]), // accepts "3" or 3
})


