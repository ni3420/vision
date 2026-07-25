import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.conversation.session["$post"], 201>
type RequestType = InferRequestType<typeof client.api.conversation.session["$post"]>

export interface ApiError extends Error {
  status?: number
}

export const useCreateSession = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, ApiError, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.conversation.session["$post"]({ json })

      if (!res.ok) {
        const error = new Error("Failed to initialize conversation session") as ApiError
        error.status = res.status
        throw error
      }

      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
    },
    onError: (err: ApiError) => {
      if (err?.status === 403) {
        toast.error("Limit reached. Please upgrade your plan.")
      } else {
        toast.error("AI Model facing high demand, please try later")
      }
    },
  })
}