import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { InferResponseType, InferRequestType } from "hono"

type ResponseType = InferResponseType<typeof client.api.image["$post"],200>
type RequestType = InferRequestType<typeof client.api.image["$post"]>

export const useCreateImage = () => {
    return useMutation<ResponseType, Error, RequestType>({
        mutationFn: async ({ json }) => {
            const res = await client.api.image["$post"]({ json })
            
            if (!res.ok) {
                throw new Error("Could not generate image")
            }
            
            
            // This now returns the JSON containing { success: true, imageUrl: "data:..." }  
            const data= await  res.json()
            return data
        }
    })
}