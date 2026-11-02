import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { getAuth } from "@clerk/hono"
import type Stripe from "stripe"
import { z } from "zod"

import { PLANS, isPaidPlan } from "@/lib/plans"
import {
  BillingNotConfiguredError,
  getStripe,
  requestAppUrl,
} from "@/lib/stripe"
import { rateLimitGuard } from "@/middleware/rate-limit-middleware"
import { User } from "@/models/user.models"

import { billingReady, planPriceId } from "./config"
import {
  applyStripeEvent,
  applySubscriptionChange,
  forgetEvent,
  markEventProcessed,
} from "./webhook"

const checkoutSchema = z.object({
  plan: z.enum(["BASIC", "PRO"]),
})

const portalSchema = z.object({
  flow: z.enum(["manage", "cancel"]).default("manage"),
})

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function plansPayload() {
  return Object.values(PLANS).map((plan) => ({
    ...plan,
    purchasable: plan.id !== "FREE" && planPriceId(plan.id) !== null,
  }))
}

const app = new Hono()
  .get("/plans", (c) => {
    return c.json(
      {
        success: true,
        data: {
          plans: plansPayload(),
          billingConfigured: billingReady(),
        },
      },
      200
    )
  })
  .post("/checkout", rateLimitGuard("billing"), zValidator("json", checkoutSchema), async (c) => {
    const userId = getAuth(c)?.userId
    if (!userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      )
    }

    const plan = c.req.valid("json").plan
    const priceId = planPriceId(plan)
    if (!priceId) {
      return c.json(
        {
          success: false,
          code: "BILLING_NOT_CONFIGURED",
          error: "Subscriptions are not available yet. A Stripe price is missing.",
        },
        503
      )
    }

    try {
      const user = await User.findOne({ userId })
      if (!user) {
        return c.json(
          {
            success: false,
            code: "USER_NOT_INITIALIZED",
            error: "User profile is not initialized yet",
          },
          404
        )
      }

      if (isPaidPlan(user.plan) && user.stripeSubscriptionId) {
        return c.json(
          {
            success: false,
            code: "ALREADY_SUBSCRIBED",
            error: "You already have a paid plan. Change it from the billing page.",
          },
          409
        )
      }

      const stripe = getStripe()
      let customerId = user.stripeCustomerId ?? null

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId },
        })
        customerId = customer.id
        await User.updateOne(
          { userId },
          { $set: { stripeCustomerId: customerId } }
        )
      }

      const appOrigin = requestAppUrl(c.req.raw)

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: userId,
        metadata: { userId, plan },
        subscription_data: { metadata: { userId, plan } },
        success_url: `${appOrigin}/billing?checkout=success`,
        cancel_url: `${appOrigin}/billing?checkout=cancelled`,
      })

      if (!session.url) {
        return c.json(
          {
            success: false,
            code: "CHECKOUT_FAILED",
            error: "Stripe did not return a checkout URL",
          },
          500
        )
      }

      return c.json({ success: true, url: session.url }, 200)
    } catch (error) {
      if (error instanceof BillingNotConfiguredError) {
        return c.json(
          {
            success: false,
            code: "BILLING_NOT_CONFIGURED",
            error: "Subscriptions are not configured on this server.",
          },
          503
        )
      }

      console.error("Stripe checkout failed:", errorMessage(error, "unknown error"))
      return c.json(
        {
          success: false,
          code: "CHECKOUT_FAILED",
          error: "Could not start checkout. Try again in a moment.",
        },
        502
      )
    }
  })
  .post("/change-plan", rateLimitGuard("billing"), zValidator("json", checkoutSchema), async (c) => {
    const userId = getAuth(c)?.userId
    if (!userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      )
    }

    const plan = c.req.valid("json").plan
    const priceId = planPriceId(plan)
    if (!priceId) {
      return c.json(
        {
          success: false,
          code: "BILLING_NOT_CONFIGURED",
          error: "Subscriptions are not available yet. A Stripe price is missing.",
        },
        503
      )
    }

    try {
      const user = await User.findOne({ userId })
        .select("plan stripeSubscriptionId")
        .lean<{
          plan?: string
          stripeSubscriptionId?: string | null
        } | null>()

      if (!user) {
        return c.json(
          {
            success: false,
            code: "USER_NOT_INITIALIZED",
            error: "User profile is not initialized yet",
          },
          404
        )
      }

      if (!user.stripeSubscriptionId) {
        return c.json(
          {
            success: false,
            code: "NO_SUBSCRIPTION",
            error: "This account has no Stripe subscription to change.",
          },
          409
        )
      }

      if (user.plan === plan) {
        return c.json(
          {
            success: false,
            code: "ALREADY_ON_PLAN",
            error: "You are already on this plan.",
          },
          409
        )
      }

      const stripe = getStripe()
      const subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId
      )

      if (
        subscription.status !== "active" &&
        subscription.status !== "trialing"
      ) {
        return c.json(
          {
            success: false,
            code: "SUBSCRIPTION_INACTIVE",
            error: "The subscription is not active. Open the billing portal to fix it.",
          },
          409
        )
      }

      if (subscription.items.data.length !== 1) {
        return c.json(
          {
            success: false,
            code: "UNSUPPORTED_SUBSCRIPTION",
            error: "This subscription has multiple prices. Manage it in the billing portal.",
          },
          409
        )
      }

      const updated = await stripe.subscriptions.update(subscription.id, {
        items: [{ id: subscription.items.data[0].id, price: priceId }],
        proration_behavior: "create_prorations",
        metadata: { ...subscription.metadata, userId, plan },
      })

      // The webhook repeats this, but syncing now keeps the UI accurate when
      // event delivery is delayed.
      await applySubscriptionChange(updated)

      return c.json({ success: true, data: { plan } }, 200)
    } catch (error) {
      if (error instanceof BillingNotConfiguredError) {
        return c.json(
          {
            success: false,
            code: "BILLING_NOT_CONFIGURED",
            error: "Subscriptions are not configured on this server.",
          },
          503
        )
      }

      console.error("Stripe plan change failed:", errorMessage(error, "unknown error"))
      return c.json(
        {
          success: false,
          code: "PLAN_CHANGE_FAILED",
          error: "Could not change your plan. Try again in a moment.",
        },
        502
      )
    }
  })
  .post("/portal", rateLimitGuard("billing"), zValidator("json", portalSchema), async (c) => {
    const userId = getAuth(c)?.userId
    if (!userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      )
    }

    const flow = c.req.valid("json").flow

    try {
      const user = await User.findOne({ userId })
        .select("stripeCustomerId stripeSubscriptionId")
        .lean<{
          stripeCustomerId?: string | null
          stripeSubscriptionId?: string | null
        } | null>()

      if (!user?.stripeCustomerId) {
        return c.json(
          {
            success: false,
            code: "NO_BILLING_ACCOUNT",
            error: "There is no billing account for this user yet.",
          },
          400
        )
      }

      const stripe = getStripe()
      const returnUrl = `${requestAppUrl(c.req.raw)}/`

      if (flow === "cancel" && user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        )
        const cancellable =
          subscription.status === "active" ||
          subscription.status === "trialing"
        const alreadyScheduled =
          subscription.cancel_at !== null ||
          subscription.cancellation_details?.reason === "cancellation_requested"

        if (cancellable && !alreadyScheduled) {
          try {
            // The generic portal only returns when the customer clicks its
            // return link. A cancellation deep link with after_completion
            // redirects automatically once the cancellation is confirmed.
            const session = await stripe.billingPortal.sessions.create({
              customer: user.stripeCustomerId,
              return_url: returnUrl,
              flow_data: {
                type: "subscription_cancel",
                subscription_cancel: { subscription: subscription.id },
                after_completion: {
                  type: "redirect",
                  redirect: { return_url: returnUrl },
                },
              },
            })

            return c.json({ success: true, url: session.url }, 200)
          } catch (error) {
            // A portal configuration without cancellation enabled must not
            // block access; fall back to the generic portal instead.
            console.error(
              "Stripe cancel flow failed:",
              errorMessage(error, "unknown error")
            )
          }
        }
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      })

      return c.json({ success: true, url: session.url }, 200)
    } catch (error) {
      if (error instanceof BillingNotConfiguredError) {
        return c.json(
          {
            success: false,
            code: "BILLING_NOT_CONFIGURED",
            error: "Billing is not configured on this server.",
          },
          503
        )
      }

      console.error("Stripe portal failed:", errorMessage(error, "unknown error"))
      return c.json(
        {
          success: false,
          code: "PORTAL_FAILED",
          error: "Could not open the billing portal. Try again in a moment.",
        },
        502
      )
    }
  })
  .post("/webhook", async (c) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    if (!secret) {
      return c.json(
        { error: "STRIPE_WEBHOOK_SECRET is not configured" },
        503
      )
    }

    const signature = c.req.header("stripe-signature")
    if (!signature) {
      return c.json({ error: "Missing Stripe signature" }, 400)
    }

    const body = await c.req.text()
    let event: Stripe.Event

    try {
      event = getStripe().webhooks.constructEvent(body, signature, secret)
    } catch (error) {
      console.error(
        "Stripe webhook signature rejected:",
        errorMessage(error, "invalid signature")
      )
      return c.json({ error: "Invalid Stripe signature" }, 400)
    }

    const firstDelivery = await markEventProcessed(event)
    if (!firstDelivery) {
      return c.json({ received: true, duplicate: true }, 200)
    }

    try {
      await applyStripeEvent(event)
      return c.json({ received: true }, 200)
    } catch (error) {
      await forgetEvent(event.id)
      console.error("Stripe webhook handler failed:", error)
      return c.json({ error: "Webhook handler failed" }, 500)
    }
  })

export default app
