import { useMutation } from "@tanstack/react-query"

import { client } from "@/lib/client"
import type { PaidPlanId } from "@/lib/plans"

import { BillingActionError } from "../lib/error"

interface CheckoutBody {
  success?: boolean
  url?: string
  code?: string
  error?: string
}

export const useCheckout = () => {
  return useMutation<{ url: string }, Error, PaidPlanId>({
    mutationFn: async (plan) => {
      const res = await client.api.billing.checkout.$post({
        json: { plan },
      })
      const body = (await res.json()) as CheckoutBody

      if (!res.ok || !body.url) {
        throw new BillingActionError(
          body.code ?? "CHECKOUT_FAILED",
          body.error ?? "Could not start checkout."
        )
      }

      return { url: body.url }
    },
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}
