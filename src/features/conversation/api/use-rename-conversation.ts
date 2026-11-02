import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { toast } from "sonner"
import {
  ConversationApiError,
  parseConversationError,
} from "../lib/errors"

type ResponseType = InferResponseType<typeof client.api.conversation[":sessionId"]["$patch"], 200>
type RequestType = InferRequestType<typeof client.api.conversation[":sessionId"]["$patch"]>

export const useRenameConversation = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ConversationApiError, RequestType>({
    mutationFn: async ({ param, json }) => {
      const res = await client.api.conversation[":sessionId"]["$patch"](
        { param, json }
      )

      if (!res.ok) {
        throw new ConversationApiError(await parseConversationError(res))
      }

      return await res.json()
    },
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", variables.param.sessionId],
      })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
    onError: (error) => {
      toast.error(error.copy.title, { description: error.copy.message })
    },
  })
}
