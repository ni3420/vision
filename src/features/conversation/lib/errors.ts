export interface ChatErrorInput {
  status?: number;
  code?: string;
  retryable?: boolean;
  retryAfterSec?: number;
  detail?: string;
}

export interface ChatErrorCopy {
  title: string;
  message: string;
  retryable: boolean;
}

const PROVIDER_HINT =
  "Chat is not configured on this server. Set GROQ_API_KEY or GEMINI_API_KEY, then try again.";

export function describeChatError(input: ChatErrorInput): ChatErrorCopy {
  const { status, code, retryable, retryAfterSec, detail } = input;

  if (status === undefined) {
    return {
      title: "Couldn't reach the server",
      message: "Check your connection and try again. Nothing was charged.",
      retryable: true,
    };
  }

  if (status === 401) {
    return {
      title: "Session expired",
      message: "Sign in again to continue this conversation.",
      retryable: false,
    };
  }

  if (status === 403) {
    if (code === "TRIAL_EXPIRED") {
      return {
        title: "Free trial ended",
        message: "Choose a plan to keep chatting.",
        retryable: false,
      };
    }
    if (code === "QUOTA_EXCEEDED") {
      return {
        title: "You're out of credits",
        message: "Choose a plan to keep chatting with Vision.",
        retryable: false,
      };
    }
    return {
      title: "Not allowed",
      message: "Your account can't send this message right now.",
      retryable: false,
    };
  }

  if (status === 404) {
    if (code === "USER_NOT_INITIALIZED") {
      return {
        title: "Account not ready",
        message: "Refresh the page so your workspace finishes setting up, then try again.",
        retryable: false,
      };
    }
    return {
      title: "Conversation not found",
      message: "This thread was deleted or belongs to another account.",
      retryable: false,
    };
  }

  if (status === 409) {
    return {
      title: "Already sent",
      message: "This message was submitted a moment ago. Open the thread to see the reply.",
      retryable: false,
    };
  }

  if (status === 429) {
    const wait = retryAfterSec && retryAfterSec > 0 ? ` Try again in ${retryAfterSec}s.` : " Try again shortly.";
    return {
      title: "Sending too fast",
      message: `You've hit the message rate limit.${wait}`,
      retryable: true,
    };
  }

  if (status === 503 && code === "PROVIDER_NOT_CONFIGURED") {
    return {
      title: "Chat provider not configured",
      message: PROVIDER_HINT,
      retryable: false,
    };
  }

  if (status === 502) {
    return {
      title: "The assistant didn't reply",
      message: "Your message is back in the composer. Nothing was charged for a failed reply.",
      retryable: retryable !== false,
    };
  }

  if (status >= 500) {
    return {
      title: "Something went wrong",
      message: "The reply failed before it was saved. Your draft is still here and nothing was charged.",
      retryable: true,
    };
  }

  return {
    title: "Message not sent",
    message: detail?.trim() || "Check the message and try again.",
    retryable: false,
  };
}

export interface ConversationErrorBody {
  code?: string;
  error?: string;
  retryable?: boolean;
}

export interface ConversationErrorResponse {
  status: number
  headers: { get(name: string): string | null }
  json(): Promise<unknown>
}

export async function parseConversationError(
  response: ConversationErrorResponse
): Promise<ChatErrorInput> {
  const retryAfterHeader = Number(response.headers.get("Retry-After"));
  let body: ConversationErrorBody | null = null;

  try {
    body = (await response.json()) as ConversationErrorBody;
  } catch {
    body = null;
  }

  return {
    status: response.status,
    code: body?.code,
    retryable: body?.retryable,
    retryAfterSec: Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader
      : undefined,
    detail: body?.error,
  };
}

export class ConversationApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly retryAfterSec?: number;
  readonly copy: ChatErrorCopy;

  constructor(input: ChatErrorInput) {
    const copy = describeChatError(input);
    super(copy.message);
    this.name = "ConversationApiError";
    this.status = input.status;
    this.code = input.code;
    this.retryAfterSec = input.retryAfterSec;
    this.copy = copy;
  }

  get retryable() {
    return this.copy.retryable;
  }
}

export function toConversationError(error: unknown): ConversationApiError {
  if (error instanceof ConversationApiError) return error;
  return new ConversationApiError({});
}
