import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"
import { InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.auth.current["$get"], 200>

export const useCurrentUser = () => {
  return useQuery<ResponseType, Error>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await client.api.auth.current["$get"]()
      
      if (!res.ok) {
        throw new Error("User credentials session synchronization failed")
      }

      return await res.json()
    }
  })
}