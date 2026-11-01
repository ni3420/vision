import { client } from "@/lib/client"
import { newIdempotencyKey } from "@/lib/idempotency"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.conversation.message["$post"], 200>
type RequestType = InferRequestType<typeof client.api.conversation.message["$post"]>

export interface ApiError extends Error {
  status?: number
}

export const usePostMessage = (sessionId: string) => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ApiError, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.conversation.message["$post"](
        { json },
        { headers: { "Idempotency-Key": newIdempotencyKey() } }
      )

      if (!res.ok) {
        const error = new Error("Failed to send message to neural pipeline") as ApiError
        error.status = res.status
        throw error
      }

      return await res.json()
    },
    onError: (err: ApiError) => {
      if (err?.status === 403) {
        toast.error("Limit reached. Please upgrade your plan.")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", sessionId] })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({queryKey:["current-user"]})
      
    },
  })
}