import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.conversation.session["$post"], 201>
type RequestType = InferRequestType<typeof client.api.conversation.session["$post"]>

export const useCreateSession = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.conversation.session["$post"]({ json })
      
      if (!res.ok) {
        throw new Error("Failed to initialize conversation session")
      }

      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({queryKey:["current-user"]})
    },
  })
}