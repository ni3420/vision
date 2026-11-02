import { useQuery } from "@tanstack/react-query"

import { client } from "@/lib/client"
import type { PlanId } from "@/lib/plans"

export interface BillingPlanSummary {
  id: PlanId
  purchasable: boolean
}

export interface BillingPlansResponse {
  success: boolean
  data: {
    plans: BillingPlanSummary[]
    billingConfigured: boolean
  }
}

export const useBillingPlans = () => {
  return useQuery<BillingPlansResponse, Error>({
    queryKey: ["billing-plans"],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await client.api.billing.plans.$get()

      if (!res.ok) {
        throw new Error("Could not load billing plans")
      }

      return (await res.json()) as BillingPlansResponse
    },
  })
}
