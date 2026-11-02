export interface GenerationErrorInfo {
  status?: number
  code?: string
  message?: string
  retryable?: boolean
}

export interface GenerationErrorCopy {
  title: string
  message: string
  code?: string
  retryable: boolean
}

/**
 * Maps server error codes to short, human copy. Every failed generation is
 * refunded by the quota guard, so the copy may state that no credit was used.
 */
export function describeGenerationError(
  error: GenerationErrorInfo | null | undefined
): GenerationErrorCopy {
  const code = error?.code
  const status = error?.status
  const serverMessage = error?.message?.trim()
  const retryable =
    error?.retryable ?? (status === 429 || (status !== undefined && status >= 500))

  switch (code) {
    case "NETWORK_ERROR":
      return {
        title: "Couldn't reach the server",
        message: "Check your connection and try again.",
        code,
        retryable: true,
      }
    case "TRIAL_EXPIRED":
      return {
        title: "Free trial ended",
        message: "Your free trial has ended. Choose a plan to keep generating.",
        code,
        retryable: false,
      }
    case "QUOTA_EXCEEDED":
      return {
        title: "You're out of credits",
        message: "Your plan has no credits left. Choose a plan to keep generating.",
        code,
        retryable: false,
      }
    case "RATE_LIMITED":
      return {
        title: "Generating too quickly",
        message: serverMessage || "Please wait a moment before trying again.",
        code,
        retryable: true,
      }
    case "DUPLICATE_REQUEST":
      return {
        title: "Already submitted",
        message: "This request was already sent. Check your results before trying again.",
        code,
        retryable: false,
      }
    case "INVALID_DIMENSIONS":
    case "INVALID_QUANTITY":
      return {
        title: "Check your settings",
        message: serverMessage || "Those settings are not supported.",
        code,
        retryable: false,
      }
    case "PROVIDER_NOT_CONFIGURED":
      return {
        title: "Image service not configured",
        message: "This workspace has no image provider key. Add one to enable generation.",
        code,
        retryable: false,
      }
    case "PROVIDER_CALL_FAILED":
      return {
        title: "The image service is busy",
        message: "Your credit was not used. Try again in a moment.",
        code,
        retryable: true,
      }
    case "STORAGE_WRITE_FAILED":
      return {
        title: "Your image could not be saved",
        message: "The image was generated but storage failed. Your credit was not used.",
        code,
        retryable: true,
      }
    case "STORAGE_NOT_CONFIGURED":
      return {
        title: "Storage not configured",
        message: "Generated images cannot be saved until storage is configured.",
        code,
        retryable: false,
      }
    case "UNAUTHORIZED":
      return {
        title: "Session expired",
        message: "Sign in again to continue.",
        code,
        retryable: false,
      }
  }

  if (status === 401) {
    return {
      title: "Session expired",
      message: "Sign in again to continue.",
      code,
      retryable: false,
    }
  }

  if (status === 403) {
    return {
      title: "Upgrade required",
      message:
        serverMessage ||
        "You need credits to keep generating. Choose a plan to continue.",
      code,
      retryable: false,
    }
  }

  return {
    title: "Generation failed",
    message:
      serverMessage || "Something went wrong. Failed generations don't use a credit.",
    code,
    retryable,
  }
}
