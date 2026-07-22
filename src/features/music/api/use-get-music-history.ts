import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"
import { InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.music.history["$get"], 200>

export const useGetMusicHistory = () => {
  return useQuery<ResponseType, Error>({
    queryKey: ["music-history"],
    queryFn: async () => {
      const res = await client.api.music.history["$get"]()
      
      if (!res.ok) {
        throw new Error("Failed to retrieve music generation history")
      }

      return await res.json()
    },
  })
}