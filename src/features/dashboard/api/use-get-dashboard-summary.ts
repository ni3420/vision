import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"
import { InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.dashboard.summary["$get"], 200>

export const useDashboardSummary = () => {
  return useQuery<ResponseType, Error>({
    queryKey: ["dashboard-summary"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await client.api.dashboard.summary["$get"]()

      if (!res.ok) {
        throw new Error("Failed to load dashboard summary")
      }

      return await res.json()
    },
  })
}
