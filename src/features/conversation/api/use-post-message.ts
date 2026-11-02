import { client } from "@/lib/client"
import { newIdempotencyKey } from "@/lib/idempotency"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { toast } from "sonner"
import {
  ConversationApiError,
  parseConversationError,
} from "../lib/errors"

type ResponseType = InferResponseType<typeof client.api.conversation.message["$post"], 200>
type RequestType = InferRequestType<typeof client.api.conversation.message["$post"]>

export const usePostMessage = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ConversationApiError, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.conversation.message["$post"](
        { json },
        { headers: { "Idempotency-Key": newIdempotencyKey() } }
      )

      if (!res.ok) {
        throw new ConversationApiError(await parseConversationError(res))
      }

      return await res.json()
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        queryClient.setQueryData(
          ["conversation", response.data.sessionId],
          response
        )
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
    onError: (error) => {
      toast.error(error.copy.title, { description: error.copy.message })
    },
  })
}
