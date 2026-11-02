export const PLAN_IDS = ["FREE", "BASIC", "PRO"] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const PAID_PLAN_IDS = ["BASIC", "PRO"] as const
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number]

export interface PlanDefinition {
  id: PlanId
  name: string
  tagline: string
  priceMonthlyUsd: number
  monthlyCredits: number | null
  trialCredits: number | null
  trialDays: number | null
  features: string[]
  highlighted: boolean
}

export const FREE_TRIAL_CREDITS = 5
export const FREE_TRIAL_DAYS = 7

/**
 * Single source of truth for plan entitlements. Amounts and credit
 * allowances are product defaults; the Stripe prices referenced by
 * STRIPE_BASIC_PRICE_ID / STRIPE_PRO_PRICE_ID must match them.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "Try every tool before you commit.",
    priceMonthlyUsd: 0,
    monthlyCredits: null,
    trialCredits: FREE_TRIAL_CREDITS,
    trialDays: FREE_TRIAL_DAYS,
    features: [
      "Images, chat, and background cutouts",
      "Private asset storage",
    ],
    highlighted: false,
  },
  BASIC: {
    id: "BASIC",
    name: "Basic",
    tagline: "For steady creators and small shops.",
    priceMonthlyUsd: 9,
    monthlyCredits: 100,
    trialCredits: null,
    trialDays: null,
    features: [
      "Everything in Free",
      "Usage dashboard",
      "Cancel anytime",
    ],
    highlighted: false,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "For teams shipping campaigns every week.",
    priceMonthlyUsd: 29,
    monthlyCredits: 500,
    trialCredits: null,
    trialDays: null,
    features: [
      "Everything in Basic",
      "Highest credit allowance",
      "Cancel anytime",
    ],
    highlighted: true,
  },
}

export function normalizePlan(value: unknown): PlanId {
  return value === "BASIC" || value === "PRO" ? value : "FREE"
}

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return normalizePlan(value) !== "FREE"
}

export function planDefinition(value: unknown): PlanDefinition {
  return PLANS[normalizePlan(value)]
}

export function monthlyCreditsFor(value: unknown): number | null {
  return PLANS[normalizePlan(value)].monthlyCredits
}

export function planPriceLabel(value: unknown): string {
  const plan = planDefinition(value)
  return plan.priceMonthlyUsd === 0
    ? "$0"
    : `$${plan.priceMonthlyUsd} / month`
}
