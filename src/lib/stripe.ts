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

// Stripe redirects the browser back to an absolute URL. In development the app
// is often reachable through a tunnel (ngrok, LAN), so NEXT_PUBLIC_APP_URL
// would send the user to a different origin where their session does not
// exist. Production stays pinned to the configured URL.
export function requestAppUrl(request: Request): string {
  if (process.env.NODE_ENV === "production") return appUrl()

  const origin = request.headers.get("origin")
  if (origin) {
    try {
      const parsed = new URL(origin)
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin
      }
    } catch {
      // Fall through to the host headers below.
    }
  }

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "http"
    return `${proto}://${host}`
  }

  return appUrl()
}
