"use client"

import { toast } from "sonner"

import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { entitlementsFor } from "@/lib/entitlements"

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
  const entitlements = data?.data ? entitlementsFor(data.data) : null

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
        includeFree
        onChoose={(plan) => {
          checkout.mutate(plan, {
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
