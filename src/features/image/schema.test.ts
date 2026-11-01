import { describe, expect, it } from "bun:test";
import {
  IMAGE_DIMENSION_MAX,
  IMAGE_DIMENSION_MIN,
  imageGenerationSchema,
  imageQuantitySchema,
  parseDimensions,
} from "./schema";

describe("parseDimensions", () => {
  it("accepts both separator styles", () => {
    expect(parseDimensions("512*512")).toEqual({ width: 512, height: 512 });
    expect(parseDimensions("1024x576")).toEqual({ width: 1024, height: 576 });
  });

  it("accepts the inclusive boundaries", () => {
    expect(parseDimensions(`${IMAGE_DIMENSION_MIN}*${IMAGE_DIMENSION_MIN}`)).toEqual({
      width: IMAGE_DIMENSION_MIN,
      height: IMAGE_DIMENSION_MIN,
    });
    expect(parseDimensions(`${IMAGE_DIMENSION_MAX}*${IMAGE_DIMENSION_MAX}`)).toEqual({
      width: IMAGE_DIMENSION_MAX,
      height: IMAGE_DIMENSION_MAX,
    });
  });

  it("rejects out-of-range and malformed values", () => {
    expect(parseDimensions("10*10")).toBeNull();
    expect(parseDimensions("1537*512")).toBeNull();
    expect(parseDimensions("512.5*512")).toBeNull();
    expect(parseDimensions("abc*def")).toBeNull();
  });
});

describe("imageQuantitySchema", () => {
  it("coerces numeric strings", () => {
    expect(imageQuantitySchema.parse("2")).toBe(2);
  });

  it("rejects zero, fractions, and values above the cap", () => {
    expect(imageQuantitySchema.safeParse("0").success).toBe(false);
    expect(imageQuantitySchema.safeParse("1.5").success).toBe(false);
    expect(imageQuantitySchema.safeParse("3").success).toBe(false);
  });
});

describe("imageGenerationSchema", () => {
  it("trims the prompt", () => {
    const parsed = imageGenerationSchema.parse({
      prompt: "  a lighthouse at dusk  ",
      dimensions: "512*512",
      quantity: 1,
    });

    expect(parsed.prompt).toBe("a lighthouse at dusk");
  });

  it("rejects short prompts and malformed dimensions", () => {
    expect(
      imageGenerationSchema.safeParse({
        prompt: "hi",
        dimensions: "512*512",
        quantity: 1,
      }).success
    ).toBe(false);

    expect(
      imageGenerationSchema.safeParse({
        prompt: "valid prompt",
        dimensions: "512by512",
        quantity: 1,
      }).success
    ).toBe(false);
  });
});
