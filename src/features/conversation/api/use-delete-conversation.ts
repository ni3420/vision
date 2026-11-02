import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferResponseType } from "hono"
import { toast } from "sonner"
import {
  ConversationApiError,
  parseConversationError,
} from "../lib/errors"

type ResponseType = InferResponseType<typeof client.api.conversation[":sessionId"]["$delete"], 200>

export const useDeleteConversation = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ConversationApiError, { sessionId: string }>({
    mutationFn: async ({ sessionId }) => {
      const res = await client.api.conversation[":sessionId"]["$delete"]({
        param: { sessionId },
      })

      if (!res.ok) {
        throw new ConversationApiError(await parseConversationError(res))
      }

      return await res.json()
    },
    onSuccess: (_response, { sessionId }) => {
      queryClient.removeQueries({ queryKey: ["conversation", sessionId] })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    },
    onError: (error) => {
      toast.error(error.copy.title, { description: error.copy.message })
    },
  })
}
