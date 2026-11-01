import assert from "node:assert/strict";
import { generateImage } from "../src/server/ai/image";
import { generateChatReply } from "../src/server/ai/chat";
import { generateMusic } from "../src/server/ai/music";
import {
  buildObjectKey,
  deleteObject,
  getObjectUrl,
  isOwnedKey,
  putObject,
  readLocalObject,
  storageDriver,
} from "../src/server/storage";

process.env.AI_MODE = "mock";

const image = await generateImage({
  prompt: "a neon city at night, cinematic",
  width: 512,
  height: 512,
});
assert.equal(image.mime, "image/jpeg");
assert.equal(image.bytes.subarray(0, 2).toString("hex"), "ffd8");
assert.ok(image.bytes.length > 1000, "image bytes should be non-trivial");
assert.equal(image.width, 512);
console.log(
  `image ok   ${image.provider}/${image.model} ${image.bytes.length} bytes ${image.width}x${image.height}`
);

const portrait = await generateImage({
  prompt: "book cover",
  width: 232,
  height: 300,
});
assert.equal(portrait.width, 232);
assert.equal(portrait.height, 300);
console.log(`image ok   resized to ${portrait.width}x${portrait.height}`);

const chat = await generateChatReply(
  [{ role: "user", content: "hello" }],
  "What can you build?"
);
assert.ok(chat.text.length > 0);
console.log(`chat ok    ${chat.provider}/${chat.model} ${chat.text.length} chars`);

const music = await generateMusic({ prompt: "lofi beat", durationSec: 4 });
assert.equal(music.bytes.subarray(0, 4).toString(), "RIFF");
assert.ok(music.bytes.length > 1000, "audio bytes should be non-trivial");
console.log(
  `music ok   ${music.provider}/${music.model} ${music.bytes.length} bytes ${music.durationSec}s`
);

const key = buildObjectKey("smoke-user", "image", "jpg");
assert.ok(isOwnedKey(key, "smoke-user"));
assert.ok(!isOwnedKey(key, "another-user"));

await putObject(key, image.bytes, "image/jpeg");
const roundTrip = await readLocalObject(key);
assert.equal(roundTrip.length, image.bytes.length);
assert.equal(await getObjectUrl(key), `/api/assets/${key}`);
await deleteObject(key);

console.log(
  `storage ok ${storageDriver()} driver, ${roundTrip.length} bytes round trip`
);

console.log("\nAll adapter smoke checks passed (mock mode).");
