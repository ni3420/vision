export const BACKGROUND_MAX_BYTES = 10 * 1024 * 1024;

export type BackgroundMime = "image/png" | "image/jpeg" | "image/webp";

const EXTENSIONS: Record<BackgroundMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type BackgroundUploadError =
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE";

export type BackgroundUploadCheck =
  | { ok: true; mime: BackgroundMime; extension: string }
  | { ok: false; code: BackgroundUploadError; error: string };

/** File signatures, checked so a renamed file cannot slip past the MIME check. */
export function sniffImageMime(bytes: Uint8Array): BackgroundMime | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function normalizeMime(value: string): string {
  const mime = value.split(";")[0].trim().toLowerCase();
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

export function validateBackgroundUpload(input: {
  bytes: Uint8Array;
  declaredMime: string;
}): BackgroundUploadCheck {
  if (input.bytes.length === 0) {
    return { ok: false, code: "FILE_EMPTY", error: "The file is empty." };
  }

  if (input.bytes.length > BACKGROUND_MAX_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      error: "Images must be 10 MB or smaller.",
    };
  }

  const declared = normalizeMime(input.declaredMime);
  if (!(declared in EXTENSIONS)) {
    return {
      ok: false,
      code: "UNSUPPORTED_FILE",
      error: "Use a PNG, JPEG, or WebP image.",
    };
  }

  const sniffed = sniffImageMime(input.bytes);
  if (!sniffed || sniffed !== declared) {
    return {
      ok: false,
      code: "UNSUPPORTED_FILE",
      error: "The file content does not match its image type.",
    };
  }

  return { ok: true, mime: sniffed, extension: EXTENSIONS[sniffed] };
}
