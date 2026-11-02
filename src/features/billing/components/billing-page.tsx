"use client"

import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { entitlementsFor } from "@/lib/entitlements"
import { PLANS, planPriceLabel } from "@/lib/plans"
import { cn } from "@/lib/utils"

import { useBillingPlans } from "../api/use-billing-plans"
import { useChangePlan } from "../api/use-change-plan"
import { useCheckout } from "../api/use-checkout"
import { usePortal } from "../api/use-portal"
import { PlanCards } from "./plan-cards"

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function BillingPage() {
  const params = useSearchParams()
  const checkoutState = params.get("checkout")

  const {
    data: userResponse,
    isPending: isUserPending,
    isError: isUserError,
    refetch,
  } = useCurrentUser()
  const { data: plansResponse } = useBillingPlans()
  const checkout = useCheckout()
  const changePlan = useChangePlan()
  const portal = usePortal()

  const entitlements = userResponse?.data
    ? entitlementsFor(userResponse.data)
    : null
  const plan = entitlements ? PLANS[entitlements.plan] : null
  const billingConfigured = plansResponse?.data.billingConfigured !== false
  const canManageSubscription = Boolean(
    userResponse?.data?.canManageSubscription
  )

  const usedPercent = entitlements
    ? Math.min(
        100,
        Math.round((entitlements.used / Math.max(1, entitlements.limit)) * 100)
      )
    : 0

  const handleChoose = (nextPlan: "BASIC" | "PRO") => {
    checkout.mutate(nextPlan, {
      onError: (error) => toast.error(error.message),
    })
  }

  const handleChange = (nextPlan: "BASIC" | "PRO") => {
    changePlan.mutate(nextPlan, {
      onSuccess: ({ plan: changed }) => {
        toast.success(`You are now on the ${PLANS[changed].name} plan.`)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  const handleManage = () => {
    portal.mutate({ flow: "manage" }, {
      onError: (error) => toast.error(error.message),
    })
  }

  const handleCancel = () => {
    portal.mutate({ flow: "cancel" }, {
      onError: (error) => toast.error(error.message),
    })
  }

  if (isUserPending) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-border/60 bg-card">
        <Loader2 className="size-5 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  if (isUserError || !entitlements || !plan) {
    return (
      <div className="space-y-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm font-semibold text-destructive">
          Could not load your billing details.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Billing &amp; plans
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your credits, switch plans, and manage your Stripe
          subscription.
        </p>
      </header>

      {checkoutState === "success" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Payment received
            </p>
            <p className="text-xs text-muted-foreground">
              Stripe is confirming the subscription. Your plan and credits
              update within a few seconds.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Refresh status
            </button>
          </div>
        </div>
      ) : null}

      {checkoutState === "cancelled" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4">
          <XCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Checkout cancelled
            </p>
            <p className="text-xs text-muted-foreground">
              Nothing was charged. You can upgrade whenever you are ready.
            </p>
          </div>
        </div>
      ) : null}

      {!billingConfigured ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Checkout is not connected on this environment
            </p>
            <p className="text-xs text-muted-foreground">
              Paid plans stay disabled until STRIPE_BASIC_PRICE_ID,
              STRIPE_PRO_PRICE_ID and STRIPE_WEBHOOK_SECRET are configured.
            </p>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {plan.name} plan
            </span>
            <p className="text-sm font-semibold text-foreground">
              {entitlements.isPaid
                ? `${entitlements.remaining} of ${entitlements.limit} credits left`
                : entitlements.trialExpired
                  ? "Free trial ended"
                  : `${entitlements.remaining} of ${entitlements.limit} trial credits left`}
            </p>
            <p className="text-xs text-muted-foreground">
              {entitlements.isPaid
                ? `${planPriceLabel(entitlements.plan)}${
                    entitlements.creditsResetAt
                      ? ` · refills ${formatDate(entitlements.creditsResetAt)}`
                      : ""
                  }`
                : entitlements.trialExpired
                  ? "Choose a plan below to keep generating."
                  : `${entitlements.trialDaysLeft ?? 0} day${
                      entitlements.trialDaysLeft === 1 ? "" : "s"
                    } left in your trial${
                      entitlements.trialEndsAt
                        ? ` · ends ${formatDate(entitlements.trialEndsAt)}`
                        : ""
                    }`}
            </p>
          </div>

          {entitlements.isPaid ? (
            <div className="text-right">
              <button
                type="button"
                onClick={handleManage}
                disabled={portal.isPending || !canManageSubscription}
                title={
                  canManageSubscription
                    ? undefined
                    : "This plan has no Stripe subscription to manage."
                }
                className="flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portal.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Manage subscription
              </button>
              {canManageSubscription ? null : (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  No Stripe subscription on this account.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                entitlements.canGenerate
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                  : "bg-rose-500"
              )}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>
              {entitlements.used} of {entitlements.limit} credits used
            </span>
            <span>{entitlements.canGenerate ? "Ready" : "Empty"}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Plans</h2>
            <p className="text-xs text-muted-foreground">
              One credit per image, chat reply, or cutout. Failed requests are
              refunded.
            </p>
          </div>
        </div>

        <PlanCards
          currentPlan={entitlements.plan}
          isPaid={entitlements.isPaid}
          pendingPlan={checkout.isPending ? (checkout.variables ?? null) : null}
          changePending={
            changePlan.isPending ? (changePlan.variables ?? null) : null
          }
          managing={portal.isPending}
          includeFree
          canManageSubscription={canManageSubscription}
          onChoose={handleChoose}
          onChange={handleChange}
          onManage={handleManage}
          onCancel={handleCancel}
        />
      </section>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          Payments handled by Stripe
        </span>
        <span className="flex items-center gap-1.5">
          <Info className="size-3.5" />
          Credits reset every 30 days on paid plans
        </span>
        <span>Cancel anytime</span>
      </div>
    </div>
  )
}

export default BillingPage
