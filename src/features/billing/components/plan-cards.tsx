"use client"

import { Check, Loader2, Sparkles } from "lucide-react"

import { PLANS, type PaidPlanId, type PlanId } from "@/lib/plans"
import { cn } from "@/lib/utils"

import { useBillingPlans } from "../api/use-billing-plans"

interface PlanCardsProps {
  currentPlan: PlanId
  isPaid: boolean
  pendingPlan?: PaidPlanId | null
  managing?: boolean
  includeFree?: boolean
  onChoose: (plan: PaidPlanId) => void
  onManage?: () => void
}

export function PlanCards({
  currentPlan,
  isPaid,
  pendingPlan,
  managing = false,
  includeFree = false,
  onChoose,
  onManage,
}: PlanCardsProps) {
  const { data } = useBillingPlans()
  const availability = new Map(
    (data?.data.plans ?? []).map((plan) => [plan.id, plan.purchasable])
  )

  const plans = Object.values(PLANS).filter(
    (plan) => includeFree || plan.id !== "FREE"
  )

  return (
    <div
      className={cn(
        "grid gap-4",
        plans.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
      )}
    >
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlan
        const available =
          plan.id === "FREE" ? true : (availability.get(plan.id) ?? true)
        const busy = pendingPlan === plan.id
        const credits =
          plan.id === "FREE"
            ? `${plan.trialCredits} credits · ${plan.trialDays} days`
            : `${plan.monthlyCredits} credits / month`

        let action: React.ReactNode

        if (isCurrent) {
          action = (
            <span className="flex h-10 items-center justify-center rounded-xl border border-border bg-secondary/60 text-xs font-bold text-foreground">
              Current plan
            </span>
          )
        } else if (isPaid) {
          action = (
            <button
              type="button"
              onClick={onManage}
              disabled={!onManage || managing}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {managing ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Change in portal
            </button>
          )
        } else if (plan.id === "FREE") {
          action = (
            <span className="flex h-10 items-center justify-center rounded-xl border border-border bg-secondary/40 text-xs font-bold text-muted-foreground">
              Included
            </span>
          )
        } else {
          action = (
            <button
              type="button"
              onClick={() => onChoose(plan.id as PaidPlanId)}
              disabled={!available || busy}
              className={cn(
                "flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                plan.highlighted
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "border border-border bg-background text-foreground hover:bg-secondary"
              )}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {available ? `Choose ${plan.name}` : "Not available yet"}
            </button>
          )
        }

        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-3xl border p-5 transition-colors",
              plan.highlighted
                ? "border-indigo-500/40 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 dark:from-indigo-950/30 dark:via-[#0d0c16] dark:to-transparent"
                : "border-border/60 bg-card",
              isCurrent && "ring-2 ring-indigo-500/30"
            )}
          >
            {plan.highlighted ? (
              <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                <Sparkles className="size-3" />
                Best value
              </span>
            ) : null}

            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {plan.tagline}
                </p>
              </div>
              {isCurrent ? (
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  Active
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl font-black text-foreground">
                ${plan.priceMonthlyUsd}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {plan.priceMonthlyUsd === 0 ? "forever" : "/ month"}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {credits}
            </p>

            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[11px] text-muted-foreground"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5">{action}</div>
          </div>
        )
      })}
    </div>
  )
}

export default PlanCards
