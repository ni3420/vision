import type Stripe from "stripe"

import { monthlyCreditsFor, normalizePlan, type PaidPlanId } from "@/lib/plans"
import { User } from "@/models/user.models"
import { StripeEvent } from "@/models/stripe-event.models"
import { nextCreditsResetAt } from "@/server/quota"

import { planFromPriceId } from "./config"

type ExpandableId = string | { id: string } | null | undefined

function asId(value: ExpandableId): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function paidPlanFrom(value: unknown): PaidPlanId | null {
  return value === "BASIC" || value === "PRO" ? value : null
}

function planForSubscription(subscription: Stripe.Subscription): PaidPlanId | null {
  const priceId = subscription.items.data[0]?.price?.id
  return planFromPriceId(priceId) ?? paidPlanFrom(subscription.metadata?.plan)
}

async function activateSubscription(
  userId: string,
  plan: PaidPlanId,
  ids: {
    customerId: string | null
    subscriptionId: string | null
    status: string
  }
) {
  const existing = await User.findOne({ userId })
    .select("plan creditsResetAt")
    .lean<{ plan?: string; creditsResetAt?: Date | null } | null>()

  if (!existing) return

  const allowance = monthlyCreditsFor(plan) ?? 0
  const needsAllowance =
    normalizePlan(existing.plan) !== plan || !existing.creditsResetAt

  const set: Record<string, unknown> = {
    plan,
    subscriptionStatus: ids.status,
    trialEndsAt: null,
  }
  if (ids.customerId) set.stripeCustomerId = ids.customerId
  if (ids.subscriptionId) set.stripeSubscriptionId = ids.subscriptionId
  if (needsAllowance) {
    set.credits = allowance
    set.creditsResetAt = nextCreditsResetAt()
  }

  await User.updateOne({ userId }, { $set: set })
}

async function downgradeToFree(userId: string, status: string) {
  await User.updateOne(
    { userId },
    {
      $set: {
        plan: "FREE",
        credits: 0,
        creditsResetAt: null,
        subscriptionStatus: status,
        stripeSubscriptionId: null,
        trialEndsAt: new Date(),
      },
    }
  )
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = paidPlanFrom(session.metadata?.plan)
  if (!userId || !plan) return

  await activateSubscription(userId, plan, {
    customerId: asId(session.customer),
    subscriptionId: asId(session.subscription),
    status: "active",
  })
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  if (subscription.status === "active" || subscription.status === "trialing") {
    const plan = planForSubscription(subscription)
    if (plan) {
      await activateSubscription(userId, plan, {
        customerId: asId(subscription.customer),
        subscriptionId: subscription.id,
        status: subscription.status,
      })
      return
    }
  }

  if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    await downgradeToFree(userId, subscription.status)
    return
  }

  await User.updateOne(
    { userId },
    {
      $set: {
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
      },
    }
  )
}

async function userIdForInvoice(invoice: Stripe.Invoice): Promise<string | null> {
  const metadata = invoice.parent?.subscription_details?.metadata
  if (metadata?.userId) return metadata.userId

  const customerId = asId(invoice.customer)
  if (!customerId) return null

  const user = await User.findOne({ stripeCustomerId: customerId })
    .select("userId")
    .lean<{ userId: string } | null>()

  return user?.userId ?? null
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const userId = await userIdForInvoice(invoice)
  if (!userId) return

  const user = await User.findOne({ userId })
    .select("plan")
    .lean<{ plan?: string } | null>()
  const plan = normalizePlan(user?.plan)
  if (plan === "FREE") return

  await User.updateOne(
    { userId },
    {
      $set: {
        credits: monthlyCreditsFor(plan) ?? 0,
        creditsResetAt: nextCreditsResetAt(),
        subscriptionStatus: "active",
      },
    }
  )
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = await userIdForInvoice(invoice)
  if (!userId) return

  await User.updateOne(
    { userId },
    { $set: { subscriptionStatus: "past_due" } }
  )
}

export async function applyStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      return
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object as Stripe.Subscription)
      return
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      if (subscription.metadata?.userId) {
        await downgradeToFree(subscription.metadata.userId, "canceled")
      }
      return
    }
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      return
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      return
    default:
      return
  }
}

export async function markEventProcessed(event: Stripe.Event): Promise<boolean> {
  try {
    await StripeEvent.create({ _id: event.id, type: event.type })
    return true
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false
    throw error
  }
}

export async function forgetEvent(eventId: string) {
  await StripeEvent.deleteOne({ _id: eventId })
}
