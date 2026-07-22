import { z } from "zod";

export const GenerateMusicSchema = z.object({
  prompt: z.string().min(3, "Prompt must be at least 3 characters"),
  duration: z.number().min(5).max(60).default(15),
  genre: z.string().optional(),
});

export type GenerateMusicInput = z.infer<typeof GenerateMusicSchema>;