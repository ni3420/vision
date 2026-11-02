import { PLANS, type PlanId } from "@/lib/plans"

export type PlanAction =
  | { kind: "current"; label: string }
  | { kind: "checkout"; label: string; disabled: boolean }
  | {
      kind: "portal"
      label: string
      disabled: boolean
      hint: string | null
    }

interface PlanActionInput {
  planId: PlanId
  currentPlan: PlanId
  isPaid: boolean
  purchasable: boolean
  canManageSubscription: boolean
}

const NO_SUBSCRIPTION_HINT =
  "Plan changes need an active Stripe subscription."

/**
 * Existing subscribers never start a second Checkout: upgrades, switches, and
 * the move to Free all happen in the Billing Portal so Stripe prorates and
 * cancels the current subscription.
 */
export function planActionFor({
  planId,
  currentPlan,
  isPaid,
  purchasable,
  canManageSubscription,
}: PlanActionInput): PlanAction {
  if (planId === currentPlan) {
    return { kind: "current", label: "Current plan" }
  }

  const plan = PLANS[planId]

  if (!isPaid) {
    return {
      kind: "checkout",
      label: purchasable ? `Choose ${plan.name}` : "Not available yet",
      disabled: !purchasable,
    }
  }

  const label =
    planId === "FREE"
      ? "Downgrade to Free"
      : plan.priceMonthlyUsd > PLANS[currentPlan].priceMonthlyUsd
        ? `Upgrade to ${plan.name}`
        : `Switch to ${plan.name}`

  return {
    kind: "portal",
    label,
    disabled: !canManageSubscription,
    hint: canManageSubscription ? null : NO_SUBSCRIPTION_HINT,
  }
}
