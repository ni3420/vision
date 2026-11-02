import { useMutation } from "@tanstack/react-query"

import { client } from "@/lib/client"

import { BillingActionError } from "../lib/error"

export type PortalFlow = "manage" | "cancel"

interface PortalBody {
  success?: boolean
  url?: string
  code?: string
  error?: string
}

export const usePortal = () => {
  return useMutation<{ url: string }, Error, { flow?: PortalFlow } | void>({
    mutationFn: async (variables) => {
      const res = await client.api.billing.portal.$post({
        json: { flow: variables?.flow ?? "manage" },
      })
      const body = (await res.json()) as PortalBody

      if (!res.ok || !body.url) {
        throw new BillingActionError(
          body.code ?? "PORTAL_FAILED",
          body.error ?? "Could not open the billing portal."
        )
      }

      return { url: body.url }
    },
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}
