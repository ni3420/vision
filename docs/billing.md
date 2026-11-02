# Billing, plans, and credits

Last updated: 2026-11-02

## Plans

`src/lib/plans.ts` is the single source of truth. Stripe prices must match these amounts.

| Plan | Price | Credits | Notes |
| --- | --- | --- | --- |
| Free | $0 | 5 | One 7-day trial per account |
| Basic | $9 / month | 100 / month | Recurring subscription |
| Pro | $29 / month | 500 / month | Highlighted plan |

One dedicated credit is charged per request (one image request, one chat reply, one cutout). Quantity within a request does not change the cost. Failed requests are refunded.

## Trial and credit rules

- A new FREE user gets `trialEndsAt = createdAt + 7 days`. If the field is missing, `entitlementsFor` derives it from `createdAt`.
- The FREE trial stops generating when either the 5 credits are used or the 7 days elapse. Expiry wins even if credits remain.
- Paid users spend from `credits`. The allowance refills when `creditsResetAt` is in the past (lazy refill on the next quota check) and on `invoice.paid`.
- All charged requests create a `usage_ledger` row with an idempotency key. Refunds flip that row exactly once and restore the matching counter (`freeUsesCount` or `credits`).

## Server surface

| Route | Purpose |
| --- | --- |
| `GET /api/billing/plans` | Plan catalog with a `purchasable` flag per paid plan |
| `POST /api/billing/checkout` | Creates/reuses a Stripe customer, then a subscription Checkout session |
| `POST /api/billing/portal` | Opens the Stripe Billing Portal for the stored customer |
| `POST /api/billing/webhook` | Public, signature-verified Stripe events |

Checkout and portal are rate limited (10/min/user). Checkout rejects an already-paid user with `409 ALREADY_SUBSCRIBED`; the portal rejects a user without a customer with `400 NO_BILLING_ACCOUNT`.

## Webhook behaviour

Handled events:

- `checkout.session.completed`
- `customer.subscription.created`, `.updated`, `.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Event IDs are stored in `stripe_events` before handling. A duplicate delivery returns `200 { received: true, duplicate: true }`. If the handler throws, the marker is removed and the route returns `500` so Stripe retries.

Subscription events resolve the user from `metadata.userId` (set on the Checkout session and subscription), falling back to `stripeCustomerId`. Cancellation downgrades to FREE with no credits and marks the trial as ended.

## UI

- `/billing` shows plan status, a progress bar, the three plans, checkout banners, and a portal button.
- `UpgradeDialog` is opened by the image and background forms on a `403` and by `TrialEndedDialog` when a FREE user is expired or out of credits.
- The sidebar plan widget links to `/billing`.
- If a Stripe price is missing, `PlanCards` shows `Not available yet` and the page explains which env vars are missing.

## Environment

```
STRIPE_SECRET_KEY=
STRIPE_BASIC_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`STRIPE_PRO_PRICE_ID` falls back to the legacy `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` when empty.

## Verifying locally

1. `stripe listen --forward-to localhost:3000/api/billing/webhook`
2. Set the printed signing secret as `STRIPE_WEBHOOK_SECRET`.
3. Set both price IDs, restart the dev server (Mongoose caches the user schema at boot).
4. Sign in and open `/billing`; checkout should redirect to Stripe.

Without price IDs, checkout intentionally returns `503 BILLING_NOT_CONFIGURED`.
