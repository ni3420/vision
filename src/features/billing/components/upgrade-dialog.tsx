"use client"

import { toast } from "sonner"

import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { entitlementsFor } from "@/lib/entitlements"
import { PLANS } from "@/lib/plans"

import { useChangePlan } from "../api/use-change-plan"
import { useCheckout } from "../api/use-checkout"
import { BillingDialog } from "./billing-dialog"
import { PlanCards } from "./plan-cards"

interface UpgradeDialogProps {
  open: boolean
  onClose: () => void
}

export function UpgradeDialog({ open, onClose }: UpgradeDialogProps) {
  const { data } = useCurrentUser()
  const checkout = useCheckout()
  const changePlan = useChangePlan()
  const entitlements = data?.data ? entitlementsFor(data.data) : null
  const canManageSubscription = Boolean(data?.data?.canManageSubscription)

  const title = entitlements?.trialExpired
    ? "Your free trial has ended"
    : entitlements && !entitlements.canGenerate
      ? "You have used all your credits"
      : "Upgrade your plan"

  const description = entitlements?.trialExpired
    ? "Pick a plan to keep generating images, chat replies, and background cutouts. Your existing assets stay yours."
    : "Choose a monthly plan to unlock more credits. Every successful request uses one credit, and failed requests are refunded."

  return (
    <BillingDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
    >
      <PlanCards
        currentPlan={entitlements?.plan ?? "FREE"}
        isPaid={entitlements?.isPaid ?? false}
        pendingPlan={checkout.isPending ? (checkout.variables ?? null) : null}
        changePending={
          changePlan.isPending ? (changePlan.variables ?? null) : null
        }
        includeFree
        canManageSubscription={canManageSubscription}
        onChoose={(plan) => {
          checkout.mutate(plan, {
            onError: (error) => toast.error(error.message),
          })
        }}
        onChange={(plan) => {
          changePlan.mutate(plan, {
            onSuccess: ({ plan: changed }) => {
              toast.success(`You are now on the ${PLANS[changed].name} plan.`)
            },
            onError: (error) => toast.error(error.message),
          })
        }}
      />

      <p className="text-center text-[11px] text-muted-foreground">
        Secure checkout by Stripe · Cancel anytime · Credits refill every 30
        days
      </p>
    </BillingDialog>
  )
}

export default UpgradeDialog
