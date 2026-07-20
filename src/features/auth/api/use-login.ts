import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.auth["$post"], 200>
type RequestType = InferRequestType<typeof client.api.auth["$post"]>

export const useLogin = () => {
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.auth["$post"]({ json })
      
      if (!res.ok) {
        throw new Error("User credentials authentication sync failed")
      }

      return await res.json()
    }
  })
}