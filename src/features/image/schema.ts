import z from "zod";

export const imageGenerationSchema = z.object({
  prompt: z.string().max(1000, "Prompt cannot exceed 1000 characters"),
  dimensions: z.string().min(1, "Please select an output size"),
  quantity: z.string().min(1, "Please select count"),
})
