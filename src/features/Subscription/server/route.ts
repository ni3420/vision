import { Hono } from "hono"
import { stripe } from "@/lib/stripe"
import { User } from "@/models/user.models"
import { getAuth } from "@clerk/hono"

const app = new Hono()
  .post("/", async (c) => {
    try {

          const auth = getAuth(c)
            if (!auth?.userId) {
              return c.json({ success: false, error: "Unauthorized access vector" }, 401)
            }
      const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      const session = await stripe.checkout.sessions.create({
        mode: "subscription", // Or "subscription" for recurring plans
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID, // Use a Stripe Price ID (e.g., price_1N...)
            quantity: 1,
          },
        ],
        success_url: `${domain}/?success=true`,
        cancel_url: `${domain}/?canceled=true`,
      })

      if (!session || !session.url) {
        return c.json({ success: false, msg: "Failed to create checkout session" }, 400)
      }

       await User.findOneAndUpdate(
        { userId: auth.userId },
        {plan:"PRO"},
        {new:true}
      )
      return c.json({
        success: true,
        msg: "success",
        url: session.url,
        data: session,
      }, 200)
    } catch (error: any) {
      console.error("Stripe Checkout Error:", error)
      return c.json({ success: false, error: error.message || "Internal server error" }, 500)
    }
  })

export default app