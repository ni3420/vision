import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferResponseType, InferRequestType } from "hono"

type ResponseType = InferResponseType<typeof client.api.image["$post"], 200>
type RequestType = InferRequestType<typeof client.api.image["$post"]>

export const useCreateImage = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.image["$post"]({ json })
      
      if (!res.ok) {
        throw new Error("Could not generate image assets from neural engine pipeline")
      }
      
      return await res.json()
    },
    onSuccess: () => {
      // Invalidate both telemetry states to sync user usage counts and historical libraries instantly
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
      queryClient.invalidateQueries({ queryKey: ["image-history"] })
    }
  })
}