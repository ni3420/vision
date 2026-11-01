import { Hono } from "hono";
import { getAuth } from "@clerk/hono";
import {
  isOwnedKey,
  mimeForObjectKey,
  readLocalObject,
  storageDriver,
} from "@/server/storage";

const app = new Hono().get("/:key{.+}", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json(
      { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
      401
    );
  }

  const key = c.req.param("key");

  if (!isOwnedKey(key, auth.userId) || storageDriver() !== "local") {
    return c.json({ success: false, error: "Asset not found" }, 404);
  }

  try {
    const buffer = await readLocalObject(key);
    const body = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;

    return c.body(body, 200, {
      "Content-Type": mimeForObjectKey(key),
      "Cache-Control": "private, max-age=300",
    });
  } catch {
    return c.json({ success: false, error: "Asset not found" }, 404);
  }
});

export default app;
