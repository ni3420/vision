import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.music.generate["$post"], 201>
type RequestType = InferRequestType<typeof client.api.music.generate["$post"]>

export interface ApiError extends Error {
  status?: number
}

export const useCreateMusic = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ApiError, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.music.generate["$post"]({ json })

      if (!res.ok) {
        const error = new Error("Failed to generate music track from neural engine") as ApiError
        error.status = res.status
        throw error
      }

      return await res.json()
    },
    onSuccess: () => {
      toast.success("Music track generated successfully!")
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
      queryClient.invalidateQueries({ queryKey: ["music-history"] })
    },
    onError: (err: ApiError) => {
      if (err?.status === 403) {
        toast.error("Limit reached. Please upgrade your plan.")
      } else {
        toast.error("Failed to generate music. Please try again later.")
      }
    },
  })
}