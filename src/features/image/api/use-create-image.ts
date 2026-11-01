import { client } from "@/lib/client"
import { newIdempotencyKey } from "@/lib/idempotency"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferResponseType, InferRequestType } from "hono"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.image["$post"], 200>
type RequestType = InferRequestType<typeof client.api.image["$post"]>

export interface ApiError extends Error {
  status?: number
  code?: string
  retryable?: boolean
}

interface ErrorBody {
  code?: string
  error?: string
  retryable?: boolean
}

function apiError(
  message: string,
  extra: { status?: number; code?: string; retryable?: boolean }
): ApiError {
  return Object.assign(new Error(message), extra)
}

export const useCreateImage = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ApiError, RequestType>({
    mutationFn: async ({ json }) => {
      let res
      try {
        res = await client.api.image["$post"](
          { json },
          { headers: { "Idempotency-Key": newIdempotencyKey() } }
        )
      } catch {
        throw apiError("Couldn't reach the server", {
          code: "NETWORK_ERROR",
          retryable: true,
        })
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ErrorBody | null
        throw apiError(body?.error || "Image generation failed", {
          status: res.status,
          code: body?.code,
          retryable: body?.retryable,
        })
      }

      return await res.json()
    },
    onSuccess: () => {
      toast.success("Image generated")
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
      queryClient.invalidateQueries({ queryKey: ["image-history"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
  })
}
