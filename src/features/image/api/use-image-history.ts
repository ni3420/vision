import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"
import { InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.image.history["$get"], 200>

export const useImageHistory = () => {
  return useQuery<ResponseType, Error>({
    queryKey: ["image-history"],
    queryFn: async () => {
      const response = await client.api.image.history["$get"]()
      
      if (!response.ok) {
        throw new Error("Failed to fetch historical model assets from stream endpoint")
      }
      
      return await response.json()
    }
  })
}