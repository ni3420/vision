import { PAID_PLAN_IDS, type PaidPlanId } from "@/lib/plans"

function envValue(name: string): string | null {
  return process.env[name]?.trim() || null
}

export function planPriceId(plan: PaidPlanId): string | null {
  if (plan === "BASIC") return envValue("STRIPE_BASIC_PRICE_ID")

  return (
    envValue("STRIPE_PRO_PRICE_ID") ??
    envValue("NEXT_PUBLIC_STRIPE_PRO_PRICE_ID")
  )
}

export function planFromPriceId(
  priceId: string | null | undefined
): PaidPlanId | null {
  if (!priceId) return null
  for (const plan of PAID_PLAN_IDS) {
    if (planPriceId(plan) === priceId) return plan
  }
  return null
}

export function billingReady(): boolean {
  return PAID_PLAN_IDS.every((plan) => planPriceId(plan) !== null)
}
