import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono";

import { client } from "@/lib/client";
import { newIdempotencyKey } from "@/lib/idempotency";

export interface BackgroundItem {
  id: string;
  sourceUrl: string;
  url: string;
  width: number | null;
  height: number | null;
  mime: string;
  sourceMime: string;
  bytes: number;
  provider: string;
  model: string;
  mock: boolean;
  createdAt: string | Date;
}

export interface RemoveBackgroundResponse {
  success: boolean;
  mock?: boolean;
  background: BackgroundItem;
}

export interface BackgroundApiError extends Error {
  status?: number;
  code?: string;
  retryable?: boolean;
}

interface ErrorBody {
  code?: string;
  error?: string;
  retryable?: boolean;
}

function apiError(
  message: string,
  extra: { status?: number; code?: string; retryable?: boolean }
): BackgroundApiError {
  return Object.assign(new Error(message), extra);
}

export const useRemoveBackground = () => {
  const queryClient = useQueryClient();

  return useMutation<RemoveBackgroundResponse, BackgroundApiError, { file: File }>({
    mutationFn: async ({ file }) => {
      const form = new FormData();
      form.append("image", file, file.name);

      let res: Response;
      try {
        // The Hono client types multipart poorly, so this route uses fetch directly.
        res = await fetch("/api/background", {
          method: "POST",
          body: form,
          headers: { "Idempotency-Key": newIdempotencyKey() },
        });
      } catch {
        throw apiError("Couldn't reach the server", {
          code: "NETWORK_ERROR",
          retryable: true,
        });
      }

      const body = (await res.json().catch(() => null)) as
        | (RemoveBackgroundResponse & ErrorBody)
        | null;

      if (!res.ok || !body?.success) {
        throw apiError(body?.error || "Background removal failed", {
          status: res.status,
          code: body?.code,
          retryable: body?.retryable,
        });
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["background-history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
};

type HistoryResponse = InferResponseType<
  typeof client.api.background.history["$get"],
  200
>;

export const useBackgroundHistory = () => {
  return useQuery<HistoryResponse, Error>({
    queryKey: ["background-history"],
    queryFn: async () => {
      const res = await client.api.background.history["$get"]();

      if (!res.ok) {
        throw new Error("Failed to load background history");
      }

      return await res.json();
    },
  });
};
