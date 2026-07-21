import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"
import { InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.conversation.all["$get"], 200>

export const useGetConversations = () => {
  return useQuery<ResponseType, Error>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await client.api.conversation.all["$get"]()
      
      if (!res.ok) {
        throw new Error("Failed to retrieve conversation history")
      }

      return await res.json()
    },
  })
}