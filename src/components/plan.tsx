"use client"

import Link from "next/link"
import { Crown, Gauge, Loader2, ShieldCheck, Sparkles } from "lucide-react"

import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { entitlementsFor } from "@/lib/entitlements"
import { PLANS } from "@/lib/plans"
import { cn } from "@/lib/utils"

export const Plan = () => {
  const { data, isPending, isError } = useCurrentUser()
  const entitlements = data?.data ? entitlementsFor(data.data) : null

  if (isPending) {
    return (
      <div className="flex min-h-[132px] w-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/30 p-4">
        <Loader2 className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  if (isError || !entitlements) {
    return (
      <div className="w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-center">
        <span className="text-[11px] font-medium text-destructive">
          Failed to load plan details
        </span>
      </div>
    )
  }

  const plan = PLANS[entitlements.plan]
  const percentage = Math.min(
    100,
    Math.round((entitlements.used / Math.max(1, entitlements.limit)) * 100)
  )
  const exhausted = !entitlements.canGenerate

  return (
    <div
      className={cn(
        "w-full space-y-3 rounded-2xl border p-4",
        entitlements.isPaid
          ? "border-indigo-500/25 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 dark:from-indigo-950/30 dark:via-[#0d0c16] dark:to-transparent"
          : "border-border/60 bg-secondary/30"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {entitlements.isPaid ? (
            <Crown className="size-4 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Gauge className="size-4 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="text-xs font-bold text-foreground">
            {plan.name} plan
          </span>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold",
            exhausted
              ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {entitlements.isPaid
            ? `${entitlements.remaining} credits`
            : entitlements.trialExpired
              ? "Trial ended"
              : `${entitlements.trialDaysLeft ?? 0}d left`}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              exhausted
                ? "bg-rose-500"
                : "bg-gradient-to-r from-indigo-500 to-violet-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-[10px] font-medium text-muted-foreground">
          {entitlements.isPaid
            ? `${entitlements.used} of ${entitlements.limit} credits used this cycle`
            : entitlements.trialExpired
              ? "Choose a plan to keep generating"
              : `${entitlements.remaining} of ${entitlements.limit} free credits left`}
        </p>
      </div>

      <Link
        href="/billing"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition-colors hover:bg-indigo-700"
      >
        <Sparkles className="size-3.5" />
        {entitlements.isPaid ? "Manage plan" : "Upgrade plan"}
      </Link>

      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <ShieldCheck className="size-3 text-emerald-500" />
        <span>Secured with Stripe</span>
      </div>
    </div>
  )
}

export default Plan
