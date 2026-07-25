import { Hono } from "hono"
import { stripe } from "@/lib/stripe"
import { User } from "@/models/user.models"
import { getAuth } from "@clerk/hono"
import Stripe from "stripe"

const app = new Hono()
  .post("/", async (c) => {
    try {
      const auth = getAuth(c)
      if (!auth?.userId) {
        return c.json({ success: false, error: "Unauthorized access vector" }, 401)
      }

      const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
            quantity: 1,
          },
        ],
        // Pass Clerk User ID so webhooks can update the DB record
        metadata: {
          userId: auth.userId,
        },
        subscription_data: {
          metadata: {
            userId: auth.userId,
          },
        },
        success_url: `${domain}/?success=true`,
        cancel_url: `${domain}/?canceled=true`,
      })

      if (!session || !session.url) {
        return c.json({ success: false, msg: "Failed to create checkout session" }, 400)
      }

      return c.json(
        {
          success: true,
          msg: "success",
          url: session.url,
          data: session,
        },
        200
      )
    } catch (error: any) {
      console.error("Stripe Checkout Error:", error)
      return c.json(
        { success: false, error: error.message || "Internal server error" },
        500
      )
    }
  })
  .post("/webhook", async (c) => {
    try {
      console.log("Received Stripe Webhook Event")
      const body = await c.req.text()
      const signature = c.req.header("stripe-signature")

      if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        return c.json({ error: "Missing signature or webhook secret" }, 400)
      }

      let event: Stripe.Event

      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        )
      console.log("session type",event.type)

      } catch (err: any) {
        console.error(`Webhook Construct Event Error: ${err.message}`)
        return c.text(`Webhook Error: ${err.message}`, 400)
      }

      switch (event.type) {

        case "customer.subscription.created": {
  const subscription = event.data.object as Stripe.Subscription
  const userId = subscription.metadata?.userId

  console.log("Subscription Created User:", userId)

  if (userId) {
    await User.findOneAndUpdate(
      { userId },
      { plan: "PRO" },
      { new: true }
    )
  }

  break
}
 case "invoice.paid": {
  const invoice = event.data.object as Stripe.Invoice

  const userId =
    invoice.parent?.subscription_details?.metadata?.userId

  console.log("Invoice Paid User ID:", userId)

  if (userId) {
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { plan: "PRO" },
      { new: true }
    )

    console.log("Updated User:", updatedUser)
  } else {
    console.log("No userId found in invoice metadata")
  }

  break
}
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session
          const userId = session.metadata?.userId
          console.log("Checkout Session Completed for User ID:", userId)

          if (userId) {
            await User.findOneAndUpdate(
              { userId }, // Ensure this matches your User schema key (e.g. clerkId or userId)
              { plan: "PRO" },
              { new: true }
            )
          }
          break
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription
          const userId = subscription.metadata?.userId

          if (userId) {
            await User.findOneAndUpdate(
              { userId },
              { plan: "FREE" },
              { new: true }
            )
          }
          break
        }
      }

      return c.json({ received: true }, 200)
    } catch (error: any) {
      console.error("Webhook Execution Error:", error)
      return c.json({ error: error.message || "Webhook handler failed" }, 500)
    }
  })

export default app