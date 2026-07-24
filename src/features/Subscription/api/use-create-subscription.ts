import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.stripe["$post"]>
type RequestType = InferRequestType<typeof client.api.stripe["$post"]>

export const useCreateCheckout = () => {
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const res = await client.api.stripe["$post"]({ json })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error((errorData as any).error || "Failed to initiate Stripe payment")
      }

      return await res.json()
    },
    onSuccess: (data) => {
      // Automatically redirect user if a Hosted Checkout URL is returned
      if ("url" in data && data.url) {
        window.location.href = data.url
      }
    },
  })
}