import { useMutation, useQueryClient } from "@tanstack/react-query"

import { client } from "@/lib/client"
import type { PaidPlanId } from "@/lib/plans"

import { BillingActionError } from "../lib/error"

interface ChangePlanBody {
  success?: boolean
  data?: { plan?: PaidPlanId }
  code?: string
  error?: string
}

export const useChangePlan = () => {
  const queryClient = useQueryClient()

  return useMutation<{ plan: PaidPlanId }, Error, PaidPlanId>({
    mutationFn: async (plan) => {
      const res = await client.api.billing["change-plan"].$post({
        json: { plan },
      })
      const body = (await res.json()) as ChangePlanBody

      if (!res.ok || !body.success || !body.data?.plan) {
        throw new BillingActionError(
          body.code ?? "PLAN_CHANGE_FAILED",
          body.error ?? "Could not change your plan."
        )
      }

      return { plan: body.data.plan }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] })
    },
  })
}
