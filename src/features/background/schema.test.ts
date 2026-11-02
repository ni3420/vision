import { describe, expect, it } from "bun:test";
import {
  BACKGROUND_MAX_BYTES,
  parseBackgroundQuality,
  sniffImageMime,
  validateBackgroundUpload,
} from "./schema";

function bytesFrom(values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const WEBP_HEADER = [
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

describe("sniffImageMime", () => {
  it("recognises PNG, JPEG, and WebP signatures", () => {
    expect(sniffImageMime(bytesFrom(PNG_HEADER))).toBe("image/png");
    expect(sniffImageMime(bytesFrom(JPEG_HEADER))).toBe("image/jpeg");
    expect(sniffImageMime(bytesFrom(WEBP_HEADER))).toBe("image/webp");
  });

  it("returns null for unknown content", () => {
    expect(sniffImageMime(bytesFrom([0x47, 0x49, 0x46, 0x38]))).toBeNull();
    expect(sniffImageMime(bytesFrom([]))).toBeNull();
  });
});

describe("parseBackgroundQuality", () => {
  it("accepts the two paid/free sizes", () => {
    expect(parseBackgroundQuality("preview")).toBe("preview");
    expect(parseBackgroundQuality("full")).toBe("full");
  });

  it("defaults anything else to the free preview size", () => {
    expect(parseBackgroundQuality(undefined)).toBe("preview");
    expect(parseBackgroundQuality("50MP")).toBe("preview");
    expect(parseBackgroundQuality(42)).toBe("preview");
  });
});

describe("validateBackgroundUpload", () => {
  it("accepts a matching PNG", () => {
    expect(
      validateBackgroundUpload({
        bytes: bytesFrom(PNG_HEADER),
        declaredMime: "image/png",
      })
    ).toEqual({ ok: true, mime: "image/png", extension: "png" });
  });

  it("normalises image/jpg and ignores parameters", () => {
    expect(
      validateBackgroundUpload({
        bytes: bytesFrom(JPEG_HEADER),
        declaredMime: "image/jpg; charset=binary",
      })
    ).toEqual({ ok: true, mime: "image/jpeg", extension: "jpg" });
  });

  it("rejects an empty file", () => {
    const result = validateBackgroundUpload({
      bytes: bytesFrom([]),
      declaredMime: "image/png",
    });

    expect(result).toMatchObject({ ok: false, code: "FILE_EMPTY" });
  });

  it("rejects files over the size limit", () => {
    const result = validateBackgroundUpload({
      bytes: new Uint8Array(BACKGROUND_MAX_BYTES + 1),
      declaredMime: "image/png",
    });

    expect(result).toMatchObject({ ok: false, code: "FILE_TOO_LARGE" });
  });

  it("rejects an unsupported declared type", () => {
    const result = validateBackgroundUpload({
      bytes: bytesFrom(PNG_HEADER),
      declaredMime: "image/svg+xml",
    });

    expect(result).toMatchObject({ ok: false, code: "UNSUPPORTED_FILE" });
  });

  it("rejects content that does not match its declared type", () => {
    const result = validateBackgroundUpload({
      bytes: bytesFrom(JPEG_HEADER),
      declaredMime: "image/png",
    });

    expect(result).toMatchObject({ ok: false, code: "UNSUPPORTED_FILE" });
  });
});
