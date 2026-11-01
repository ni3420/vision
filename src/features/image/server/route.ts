import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@clerk/hono";
import {
  imageGenerationSchema,
  imageQuantitySchema,
  parseDimensions,
} from "../schema";
import { quotaGuard } from "@/middleware/quota-middleware";
import { rateLimitGuard } from "@/middleware/rate-limit-middleware";
import { generateImage } from "@/server/ai/image";
import {
  ProviderCallError,
  ProviderNotConfiguredError,
} from "@/server/ai/runtime";
import {
  buildObjectKey,
  deleteObject,
  getObjectUrl,
  putObject,
} from "@/server/storage";
import { Asset, type IAsset } from "@/models/asset.models";

const HISTORY_LIMIT = 60;

function serializeAsset(asset: IAsset & { _id: unknown }, url: string) {
  return {
    id: String(asset._id),
    url,
    prompt: asset.prompt ?? "",
    width: asset.width ?? null,
    height: asset.height ?? null,
    provider: asset.provider,
    model: asset.model,
    createdAt: asset.createdAt,
  };
}

const app = new Hono()
  .post(
    "/",
    zValidator("json", imageGenerationSchema),
    rateLimitGuard("image"),
    quotaGuard("image"),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json(
          { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
          401
        );
      }

      const body = c.req.valid("json");
      const quantity = imageQuantitySchema.safeParse(body.quantity);
      const dimensions = parseDimensions(body.dimensions);

      if (!quantity.success) {
        return c.json(
          {
            success: false,
            code: "INVALID_QUANTITY",
            error: "Quantity must be an integer between 1 and 2",
          },
          400
        );
      }

      if (!dimensions) {
        return c.json(
          {
            success: false,
            code: "INVALID_DIMENSIONS",
            error: "Dimensions must be between 64 and 1536 pixels per side",
          },
          400
        );
      }

      try {
        const results = await Promise.all(
          Array.from({ length: quantity.data }, () =>
            generateImage({
              prompt: body.prompt,
              width: dimensions.width,
              height: dimensions.height,
            })
          )
        );

        const stored: { key: string; asset: IAsset & { _id: unknown } }[] = [];

        try {
          for (const result of results) {
            const extension = result.mime === "image/png" ? "png" : "jpg";
            const key = buildObjectKey(auth.userId, "image", extension);

            await putObject(key, result.bytes, result.mime);

            const asset = await Asset.create({
              userId: auth.userId,
              kind: "image",
              objectKey: key,
              mime: result.mime,
              bytes: result.bytes.byteLength,
              width: result.width,
              height: result.height,
              prompt: body.prompt,
              provider: result.provider,
              model: result.model,
              visibility: "private",
            });

            stored.push({ key, asset });
          }
        } catch (error) {
          await Promise.all(stored.map(({ key }) => deleteObject(key)));
          throw error;
        }

        const images = await Promise.all(
          stored.map(async ({ key, asset }) =>
            serializeAsset(asset, await getObjectUrl(key))
          )
        );

        return c.json(
          {
            success: true,
            images,
            mock: results.some((result) => result.mock),
          },
          200
        );
      } catch (error) {
        if (error instanceof ProviderNotConfiguredError) {
          return c.json(
            { success: false, code: error.code, error: error.message },
            503
          );
        }
        if (error instanceof ProviderCallError) {
          return c.json(
            { success: false, code: error.code, error: error.message },
            502
          );
        }
        console.error("Image generation failed:", error);
        return c.json(
          { success: false, code: "IMAGE_GENERATION_FAILED", error: "Image generation failed" },
          500
        );
      }
    }
  )
  .get("/history", async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      );
    }

    try {
      const assets = await Asset.find({ userId: auth.userId, kind: "image" })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean<(IAsset & { _id: unknown })[]>();

      const images = await Promise.all(
        assets.map(async (asset) =>
          serializeAsset(asset, await getObjectUrl(asset.objectKey))
        )
      );

      return c.json(
        {
          success: true,
          images,
          message: images.length
            ? "Image history synchronized successfully"
            : "No generation history found for this account",
        },
        200
      );
    } catch (error) {
      console.error("Image history failed:", error);
      return c.json(
        { success: false, code: "IMAGE_HISTORY_FAILED", error: "Failed to load image history" },
        500
      );
    }
  });

export default app;
