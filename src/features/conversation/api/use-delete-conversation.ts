import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.conversation[":sessionId"]["$delete"], 200>

export const useDeleteConversation = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, { sessionId: string }>({
    mutationFn: async ({ sessionId }) => {
      const res = await client.api.conversation[":sessionId"]["$delete"]({
        param: { sessionId },
      })
      
      if (!res.ok) {
        throw new Error("Failed to delete conversation session")
      }

      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
  })
}