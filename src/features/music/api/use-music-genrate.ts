import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import toast from "sonner"

type ResponseType = InferResponseType<typeof client.api.music.generate["$post"], 201>
type RequestType = InferRequestType<typeof client.api.music.generate["$post"]>

export const useCreateMusic = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.music.generate["$post"]({ json })
      
      if (!res.ok) {
        throw new Error("Failed to generate music track from neural engine")
      }

      return await res.json()
    },
    onSuccess: () => {
      // Invalidate user telemetry (to update freeUsesCount) and music history
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
      queryClient.invalidateQueries({ queryKey: ["music-history"] })
    },
  })
}