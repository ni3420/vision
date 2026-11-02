import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { getAuth } from "@clerk/hono"
import type Stripe from "stripe"
import { z } from "zod"

import { PLANS, isPaidPlan } from "@/lib/plans"
import { appUrl, BillingNotConfiguredError, getStripe } from "@/lib/stripe"
import { rateLimitGuard } from "@/middleware/rate-limit-middleware"
import { User } from "@/models/user.models"

import { billingReady, planPriceId } from "./config"
import {
  applyStripeEvent,
  forgetEvent,
  markEventProcessed,
} from "./webhook"

const checkoutSchema = z.object({
  plan: z.enum(["BASIC", "PRO"]),
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

      if (isPaidPlan(user.plan)) {
        return c.json(
          {
            success: false,
            code: "ALREADY_SUBSCRIBED",
            error: "You already have a paid plan. Manage it from the billing portal.",
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

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: userId,
        metadata: { userId, plan },
        subscription_data: { metadata: { userId, plan } },
        success_url: `${appUrl()}/billing?checkout=success`,
        cancel_url: `${appUrl()}/billing?checkout=cancelled`,
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
  .post("/portal", rateLimitGuard("billing"), async (c) => {
    const userId = getAuth(c)?.userId
    if (!userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      )
    }

    try {
      const user = await User.findOne({ userId })
        .select("stripeCustomerId")
        .lean<{ stripeCustomerId?: string | null } | null>()

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

      const session = await getStripe().billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${appUrl()}/billing`,
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
