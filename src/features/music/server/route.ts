import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@clerk/hono";
import { Music, type IMusic } from "@/models/music.models";
import { quotaGuard } from "@/middleware/quota-middleware";
import { rateLimitGuard } from "@/middleware/rate-limit-middleware";
import { generateMusic } from "@/server/ai/music";
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
import { GenerateMusicSchema } from "../schema";

const HISTORY_LIMIT = 50;

type MusicRecord = IMusic & { _id: unknown };

async function serializeTrack(track: MusicRecord) {
  const url = track.objectKey
    ? await getObjectUrl(track.objectKey, track.audioUrl || undefined)
    : track.audioUrl;

  return {
    _id: String(track._id),
    prompt: track.prompt,
    audioUrl: url,
    duration: track.duration,
    provider: track.provider ?? null,
    model: track.model ?? null,
    createdAt: track.createdAt,
  };
}

const app = new Hono()
  .get("/history", async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      );
    }

    try {
      const tracks = await Music.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean<MusicRecord[]>();

      return c.json(
        {
          success: true,
          data: await Promise.all(tracks.map((track) => serializeTrack(track))),
        },
        200
      );
    } catch (error) {
      console.error("Music history failed:", error);
      return c.json(
        { success: false, code: "MUSIC_HISTORY_FAILED", error: "Failed to retrieve music history" },
        500
      );
    }
  })
  .post(
    "/generate",
    zValidator("json", GenerateMusicSchema),
    rateLimitGuard("music"),
    quotaGuard("music"),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json(
          { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
          401
        );
      }

      const { prompt, duration } = c.req.valid("json");

      try {
        const result = await generateMusic({
          prompt,
          durationSec: duration,
        });

        const extension = result.mime.includes("wav") ? "wav" : "mp3";
        const key = buildObjectKey(auth.userId, "music", extension);

        const object = await putObject(key, result.bytes, result.mime);

        try {
          const track = await Music.create({
            userId: auth.userId,
            prompt,
            audioUrl: object.url ?? "",
            objectKey: key,
            provider: result.provider,
            model: result.model,
            duration: result.durationSec,
          });

          return c.json(
            {
              success: true,
              mock: result.mock,
              data: await serializeTrack(track),
            },
            201
          );
        } catch (error) {
          await deleteObject(key);
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
            { success: false, code: error.code, error: error.message },
            502
          );
        }
        console.error("Music generation failed:", error);
        return c.json(
          { success: false, code: "MUSIC_GENERATION_FAILED", error: "Failed to generate track" },
          500
        );
      }
    }
  );

export default app;
