import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";

export type StorageDriver = "local" | "s3";

function localRoot() {
  const configured = process.env.LOCAL_STORAGE_DIR?.trim();
  if (configured) return configured;
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads");
}

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export class StorageNotConfiguredError extends Error {
  readonly code = "STORAGE_NOT_CONFIGURED";
}

let cachedClient: S3Client | null = null;

export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (explicit === "s3" || explicit === "local") return explicit;

  const s3Ready =
    !!process.env.S3_BUCKET &&
    !!process.env.S3_ACCESS_KEY_ID &&
    !!process.env.S3_SECRET_ACCESS_KEY;

  return s3Ready ? "s3" : "local";
}

function s3(): S3Client {
  if (!process.env.S3_BUCKET) {
    throw new StorageNotConfiguredError("S3_BUCKET is not set");
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return cachedClient;
}

export function buildObjectKey(
  userId: string,
  kind: "image" | "music",
  extension: string
) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `users/${userId}/${kind}/${year}/${month}/${randomUUID()}.${ext}`;
}

export function isOwnedKey(key: string, userId: string) {
  if (key.includes("..") || key.includes("\\") || key.startsWith("/")) return false;
  return key.startsWith(`users/${userId}/`);
}

export function mimeForObjectKey(key: string, fallback = "application/octet-stream") {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[ext] ?? fallback;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (storageDriver() === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return;
  }

  const target = path.join(localRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

export async function deleteObject(key: string): Promise<void> {
  try {
    if (storageDriver() === "s3") {
      await s3().send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
      );
      return;
    }
    await unlink(path.join(localRoot(), key));
  } catch {
    // Best-effort cleanup. Orphaned objects are handled by retention tooling.
  }
}

export async function getObjectUrl(key: string, expiresInSeconds = 3600) {
  if (storageDriver() === "s3") {
    return presign(
      s3(),
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
      { expiresIn: expiresInSeconds }
    );
  }
  return `/api/assets/${key}`;
}

export async function readLocalObject(key: string): Promise<Buffer> {
  return readFile(path.join(localRoot(), key));
}
