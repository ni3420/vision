import { Hono } from "hono";
import { getAuth } from "@clerk/hono";

import { quotaGuard } from "@/middleware/quota-middleware";
import { rateLimitGuard } from "@/middleware/rate-limit-middleware";
import { removeBackground } from "@/server/ai/background";
import {
  ProviderCallError,
  ProviderNotConfiguredError,
} from "@/server/ai/runtime";
import {
  StorageNotConfiguredError,
  StorageUploadError,
  buildObjectKey,
  deleteObject,
  getObjectUrl,
  putObject,
  storageDriver,
} from "@/server/storage";
import { Background, type IBackground } from "@/models/background.models";
import {
  BACKGROUND_MAX_BYTES,
  parseBackgroundQuality,
  validateBackgroundUpload,
  type BackgroundUploadError,
} from "../schema";

const HISTORY_LIMIT = 30;
// Multipart framing and field overhead sit on top of the image bytes.
const BODY_OVERHEAD_BYTES = 1_000_000;

type BackgroundRecord = IBackground & { _id: unknown };

const UPLOAD_STATUS: Record<BackgroundUploadError, 400 | 413> = {
  FILE_EMPTY: 400,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_FILE: 400,
};

async function serializeBackground(
  background: BackgroundRecord,
  sourceUrl: string,
  url: string
) {
  return {
    id: String(background._id),
    sourceUrl,
    url,
    width: background.width ?? null,
    height: background.height ?? null,
    mime: background.mime,
    sourceMime: background.sourceMime,
    bytes: background.bytes,
    provider: background.provider,
    model: background.model,
    quality: background.quality ?? null,
    mock: background.mock,
    createdAt: background.createdAt,
  };
}

const app = new Hono()
  .post("/", rateLimitGuard("background"), quotaGuard("background"), async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      );
    }

    const declaredLength = Number(c.req.header("content-length") ?? "0");
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > BACKGROUND_MAX_BYTES + BODY_OVERHEAD_BYTES
    ) {
      return c.json(
        {
          success: false,
          code: "FILE_TOO_LARGE",
          error: "Images must be 10 MB or smaller.",
        },
        413
      );
    }

    let body: Record<string, string | File>;
    try {
      body = await c.req.parseBody();
    } catch {
      return c.json(
        {
          success: false,
          code: "INVALID_UPLOAD",
          error: "Send the image as multipart/form-data.",
        },
        400
      );
    }

    const file = body.image;
    if (!file || typeof file === "string") {
      return c.json(
        {
          success: false,
          code: "INVALID_UPLOAD",
          error: "Attach an image in the 'image' field.",
        },
        400
      );
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(await file.arrayBuffer());
    } catch {
      return c.json(
        { success: false, code: "INVALID_UPLOAD", error: "The upload could not be read." },
        400
      );
    }

    const check = validateBackgroundUpload({
      bytes,
      declaredMime: file.type,
    });

    if (!check.ok) {
      return c.json(
        { success: false, code: check.code, error: check.error },
        UPLOAD_STATUS[check.code]
      );
    }

    const quality = parseBackgroundQuality(body.quality);

    try {
      const cutout = await removeBackground({
        bytes,
        mime: check.mime,
        filename: `source.${check.extension}`,
        quality,
      });

      const sourceKey = buildObjectKey(auth.userId, "background", check.extension);
      const resultKey = buildObjectKey(auth.userId, "background", "png");

      let sourceStored = false;
      let resultStored = false;
      let resultUrl: string | undefined;

      try {
        const source = await putObject(sourceKey, bytes, check.mime);
        sourceStored = true;

        const result = await putObject(resultKey, cutout.bytes, cutout.mime);
        resultStored = true;
        resultUrl = result.url;

        const background = await Background.create({
          userId: auth.userId,
          sourceKey,
          sourceUrl: source.url,
          sourceMime: check.mime,
          sourceBytes: bytes.byteLength,
          objectKey: resultKey,
          url: result.url,
          mime: cutout.mime,
          bytes: cutout.bytes.byteLength,
          width: cutout.width,
          height: cutout.height,
          provider: cutout.provider,
          model: cutout.model,
          quality,
          mock: cutout.mock,
        });

        return c.json(
          {
            success: true,
            mock: cutout.mock,
            background: await serializeBackground(
              background,
              await getObjectUrl(sourceKey, source.url),
              await getObjectUrl(resultKey, resultUrl)
            ),
            storage: storageDriver(),
          },
          200
        );
      } catch (error) {
        if (resultStored) await deleteObject(resultKey);
        if (sourceStored) await deleteObject(sourceKey);
        throw error;
      }
    } catch (error) {
      if (error instanceof ProviderNotConfiguredError) {
        return c.json(
          { success: false, code: error.code, error: error.message },
          503
        );
      }
      if (error instanceof ProviderCallError) {
        return c.json(
          {
            success: false,
            code: error.code,
            error: error.message,
            retryable: error.retryable,
          },
          502
        );
      }
      if (error instanceof StorageUploadError) {
        console.error(`Background storage failed (${error.driver}):`, error.message);
        return c.json(
          {
            success: false,
            code: error.code,
            error: "The cutout was created but could not be saved. Try again.",
            retryable: true,
          },
          502
        );
      }
      if (error instanceof StorageNotConfiguredError) {
        return c.json(
          { success: false, code: error.code, error: error.message, retryable: false },
          503
        );
      }
      console.error("Background removal failed:", error);
      return c.json(
        {
          success: false,
          code: "BACKGROUND_REMOVAL_FAILED",
          error: "Background removal failed",
        },
        500
      );
    }
  })
  .get("/history", async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      );
    }

    try {
      const backgrounds = await Background.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean<BackgroundRecord[]>();

      const items = await Promise.all(
        backgrounds.map(async (background) =>
          serializeBackground(
            background,
            await getObjectUrl(background.sourceKey, background.sourceUrl),
            await getObjectUrl(background.objectKey, background.url)
          )
        )
      );

      return c.json(
        {
          success: true,
          backgrounds: items,
          message: items.length
            ? "Background history synchronized successfully"
            : "No background removals found for this account",
        },
        200
      );
    } catch (error) {
      console.error("Background history failed:", error);
      return c.json(
        {
          success: false,
          code: "BACKGROUND_HISTORY_FAILED",
          error: "Failed to load background history",
        },
        500
      );
    }
  });

export default app;
