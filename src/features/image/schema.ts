import z from "zod";

export const IMAGE_DIMENSION_MIN = 64;
export const IMAGE_DIMENSION_MAX = 1536;
export const IMAGE_QUANTITY_MAX = 2;

export const imageGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Prompt must be at least 3 characters")
    .max(1000, "Prompt must be 1000 characters or fewer"),
  dimensions: z
    .string()
    .regex(/^\d{2,4}[*x]\d{2,4}$/, "Dimensions must look like 512*512"),
  quantity: z.union([z.number(), z.string()]),
});

export const imageQuantitySchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(IMAGE_QUANTITY_MAX);

export function parseDimensions(value: string) {
  const [width, height] = value.split(/[*x]/).map((part) => Number(part));

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < IMAGE_DIMENSION_MIN ||
    height < IMAGE_DIMENSION_MIN ||
    width > IMAGE_DIMENSION_MAX ||
    height > IMAGE_DIMENSION_MAX
  ) {
    return null;
  }

  return { width, height };
}

export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;
