import Stripe from "stripe"

export class BillingNotConfiguredError extends Error {
  readonly code = "BILLING_NOT_CONFIGURED"

  constructor(message = "Stripe is not configured") {
    super(message)
    this.name = "BillingNotConfiguredError"
  }
}

let cached: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new BillingNotConfiguredError("STRIPE_SECRET_KEY is not set")
  }

  cached ??= new Stripe(key, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  })

  return cached
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:3000"
  )
}
