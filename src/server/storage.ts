import { createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";

export type StorageDriver = "local" | "s3" | "imagekit";

export interface StoredObject {
  key: string;
  /** Durable, non-expiring URL. Absent for drivers that require signing. */
  url?: string;
}

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_UPLOAD_TIMEOUT_MS = 30_000;

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

export class StorageUploadError extends Error {
  readonly code = "STORAGE_WRITE_FAILED";

  constructor(
    message: string,
    readonly driver: StorageDriver
  ) {
    super(message);
    this.name = "StorageUploadError";
  }
}

let cachedClient: S3Client | null = null;

export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (explicit === "s3" || explicit === "local" || explicit === "imagekit") {
    return explicit;
  }

  if (process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
    return "imagekit";
  }

  const s3Ready =
    !!process.env.S3_BUCKET &&
    !!process.env.S3_ACCESS_KEY_ID &&
    !!process.env.S3_SECRET_ACCESS_KEY;

  return s3Ready ? "s3" : "local";
}

function imageKitEndpoint(): string {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim().replace(/\/+$/, "");
  if (!endpoint) {
    throw new StorageNotConfiguredError("IMAGEKIT_URL_ENDPOINT is not set");
  }
  return endpoint;
}

function imageKitPrivateKey(): string {
  const key = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  if (!key) {
    throw new StorageNotConfiguredError("IMAGEKIT_PRIVATE_KEY is not set");
  }
  return key;
}

export function imageKitPrivateFiles(): boolean {
  return process.env.IMAGEKIT_PRIVATE_FILES?.trim().toLowerCase() === "true";
}

export function imagekitPublicUrl(
  key: string,
  endpoint = imageKitEndpoint()
): string {
  return `${endpoint.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

/**
 * ImageKit signs a URL as HMAC-SHA1(privateKey, pathname + expiry) in `ik-s`,
 * with the unix expiry in `ik-t`.
 */
export function signImageKitUrl(
  url: string,
  privateKey: string,
  expiresInSeconds: number,
  now: Date = new Date()
): string {
  const expires = Math.floor(now.getTime() / 1000) + expiresInSeconds;
  const parsed = new URL(url);
  const signature = createHmac("sha1", privateKey)
    .update(`${parsed.pathname}${expires}`)
    .digest("hex");

  parsed.searchParams.set("ik-t", String(expires));
  parsed.searchParams.set("ik-s", signature);
  return parsed.toString();
}

/** Backblaze and other S3-compatible providers often document a bare host. */
export function s3Endpoint(): string | undefined {
  const raw = process.env.S3_ENDPOINT?.trim();
  if (!raw) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

function s3(): S3Client {
  if (!process.env.S3_BUCKET) {
    throw new StorageNotConfiguredError("S3_BUCKET is not set");
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: s3Endpoint(),
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

async function putImageKit(
  key: string,
  body: Buffer,
  contentType: string
): Promise<StoredObject> {
  const privateKey = imageKitPrivateKey();
  const segments = key.split("/");
  const fileName = segments.pop() ?? "asset";
  const folder = `/${segments.join("/")}`;

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(body)], { type: contentType }), fileName);
  form.append("fileName", fileName);
  form.append("folder", folder);
  form.append("useUniqueFileName", "false");
  if (imageKitPrivateFiles()) form.append("isPrivateFile", "true");

  let response: Response;
  try {
    response = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
      },
      body: form,
      signal: AbortSignal.timeout(IMAGEKIT_UPLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    throw new StorageUploadError(
      `ImageKit upload failed: ${(error as Error).message}`,
      "imagekit"
    );
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new StorageUploadError(
      `ImageKit upload failed (${response.status}): ${detail}`,
      "imagekit"
    );
  }

  const payload = (await response.json().catch(() => null)) as {
    url?: string;
  } | null;

  const url = payload?.url?.startsWith("http")
    ? payload.url
    : imagekitPublicUrl(key);

  return { key, url: imageKitPrivateFiles() ? undefined : url };
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<StoredObject> {
  const driver = storageDriver();

  if (driver === "imagekit") {
    return putImageKit(key, body, contentType);
  }

  if (driver === "s3") {
    try {
      await s3().send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
    } catch (error) {
      throw new StorageUploadError(
        `S3 upload failed: ${(error as Error).message}`,
        "s3"
      );
    }
    return { key };
  }

  const target = path.join(localRoot(), key);
  try {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  } catch (error) {
    throw new StorageUploadError(
      `Local write failed: ${(error as Error).message}`,
      "local"
    );
  }
  return { key };
}

export async function deleteObject(key: string): Promise<void> {
  try {
    if (storageDriver() === "s3") {
      await s3().send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
      );
      return;
    }
    if (storageDriver() === "imagekit") {
      // ImageKit deletes by fileId; without one the object is left to the
      // media library's own retention. Metadata is still removed.
      return;
    }
    await unlink(path.join(localRoot(), key));
  } catch {
    // Best-effort cleanup. Orphaned objects are handled by retention tooling.
  }
}

export async function getObjectUrl(
  key: string,
  durableUrl?: string | null,
  expiresInSeconds = 3600
) {
  const driver = storageDriver();

  if (driver === "imagekit") {
    const base = durableUrl?.startsWith("http")
      ? durableUrl
      : imagekitPublicUrl(key);
    return imageKitPrivateFiles()
      ? signImageKitUrl(base, imageKitPrivateKey(), expiresInSeconds)
      : base;
  }

  if (driver === "s3") {
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
