import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"
import { InferResponseType } from "hono"
import {
  ConversationApiError,
  parseConversationError,
} from "../lib/errors"

type ResponseType = InferResponseType<typeof client.api.conversation[":sessionId"]["$get"], 200>

export const useGetConversation = (sessionId: string) => {
  return useQuery<ResponseType, ConversationApiError>({
    queryKey: ["conversation", sessionId],
    queryFn: async () => {
      const res = await client.api.conversation[":sessionId"]["$get"]({
        param: { sessionId },
      })

      if (!res.ok) {
        throw new ConversationApiError(await parseConversationError(res))
      }

      return await res.json()
    },
    enabled: !!sessionId,
  })
}
