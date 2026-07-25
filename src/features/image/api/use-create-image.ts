import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferResponseType, InferRequestType } from "hono"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.image["$post"], 200>
type RequestType = InferRequestType<typeof client.api.image["$post"]>

export interface ApiError extends Error {
  status?: number
}

export const useCreateImage = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ApiError, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.image["$post"]({ json })

      if (!res.ok) {
        const error = new Error("Could not generate image assets from neural engine pipeline") as ApiError
        error.status = res.status
        throw error
      }

      return await res.json()
    },
    onSuccess: () => {
      toast.success("Image generated successfully!")
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
      queryClient.invalidateQueries({ queryKey: ["image-history"] })
    },
    onError: (err: ApiError) => {
      if (err?.status === 403) {
        toast.error("Limit reached. Please upgrade your plan.")
      } else {
        toast.error("Failed to generate image. Please try again later.")
      }
    },
  })
}