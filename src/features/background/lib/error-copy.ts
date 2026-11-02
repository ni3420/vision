export interface BackgroundErrorInfo {
  status?: number;
  code?: string;
  message?: string;
  retryable?: boolean;
}

export interface BackgroundErrorCopy {
  title: string;
  message: string;
  code?: string;
  retryable: boolean;
}

/**
 * Maps server error codes to short, human copy. Every failed removal is
 * refunded by the quota guard, so the copy may state that no credit was used.
 */
export function describeBackgroundError(
  error: BackgroundErrorInfo | null | undefined
): BackgroundErrorCopy {
  const code = error?.code;
  const status = error?.status;
  const serverMessage = error?.message?.trim();
  const retryable =
    error?.retryable ?? (status === 429 || (status !== undefined && status >= 500));

  switch (code) {
    case "NETWORK_ERROR":
      return {
        title: "Couldn't reach the server",
        message: "Check your connection and try again.",
        code,
        retryable: true,
      };
    case "QUOTA_EXCEEDED":
      return {
        title: "Free generations used up",
        message: "You have used all 5 free generations. Upgrade to Pro to keep cutting out images.",
        code,
        retryable: false,
      };
    case "RATE_LIMITED":
      return {
        title: "Removing too quickly",
        message: serverMessage || "Please wait a moment before trying again.",
        code,
        retryable: true,
      };
    case "DUPLICATE_REQUEST":
      return {
        title: "Already submitted",
        message: "This request was already sent. Check your results before trying again.",
        code,
        retryable: false,
      };
    case "FILE_EMPTY":
    case "FILE_TOO_LARGE":
    case "UNSUPPORTED_FILE":
    case "INVALID_UPLOAD":
      return {
        title: "Check the file",
        message: serverMessage || "Use a PNG, JPEG, or WebP image up to 10 MB.",
        code,
        retryable: false,
      };
    case "PROVIDER_NOT_CONFIGURED":
      return {
        title: "Background service not configured",
        message:
          "This workspace has no remove.bg key. Add REMOVE_BG_API_KEY to enable cutouts.",
        code,
        retryable: false,
      };
    case "PROVIDER_CALL_FAILED":
      // The server marks exhausted credits and rejected keys as non-retryable;
      // surfacing its message avoids offering a retry that cannot succeed.
      return {
        title: retryable
          ? "The cutout service is busy"
          : "The cutout service could not process this image",
        message:
          serverMessage ||
          (retryable
            ? "Your credit was not used. Try again in a moment."
            : "Your credit was not used. Check the provider account, then try again."),
        code,
        retryable,
      };
    case "STORAGE_WRITE_FAILED":
      return {
        title: "Your cutout could not be saved",
        message: "The cutout was created but storage failed. Your credit was not used.",
        code,
        retryable: true,
      };
    case "STORAGE_NOT_CONFIGURED":
      return {
        title: "Storage not configured",
        message: "Cutouts cannot be saved until storage is configured.",
        code,
        retryable: false,
      };
    case "UNAUTHORIZED":
      return {
        title: "Session expired",
        message: "Sign in again to continue.",
        code,
        retryable: false,
      };
  }

  if (status === 401) {
    return {
      title: "Session expired",
      message: "Sign in again to continue.",
      code,
      retryable: false,
    };
  }

  if (status === 403) {
    return {
      title: "Free generations used up",
      message: "You have used all 5 free generations. Upgrade to Pro to keep cutting out images.",
      code,
      retryable: false,
    };
  }

  return {
    title: "Background removal failed",
    message:
      serverMessage || "Something went wrong. Failed removals don't use a credit.",
    code,
    retryable,
  };
}
