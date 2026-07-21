import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.conversation.message["$post"], 200>
type RequestType = InferRequestType<typeof client.api.conversation.message["$post"]>

export const usePostMessage = (sessionId: string) => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.conversation.message["$post"]({ json })
      
      if (!res.ok) {
        throw new Error("Failed to send message to neural pipeline")
      }

      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", sessionId] })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({queryKey:["current-user"]})
      
    },
  })
}