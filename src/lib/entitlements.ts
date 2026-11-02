import {
  FREE_TRIAL_DAYS,
  normalizePlan,
  PLANS,
  type PlanId,
} from "./plans"

const DAY_MS = 24 * 60 * 60 * 1000

type DateLike = Date | string | null | undefined

export interface EntitlementUser {
  plan?: string | null
  freeUsesCount?: number | null
  credits?: number | null
  creditsResetAt?: DateLike
  trialEndsAt?: DateLike
  createdAt?: DateLike
}

export interface Entitlements {
  plan: PlanId
  isPaid: boolean
  isTrial: boolean
  limit: number
  remaining: number
  used: number
  trialEndsAt: string | null
  trialDaysLeft: number | null
  trialExpired: boolean
  creditsResetAt: string | null
  canGenerate: boolean
}

function toDate(value: DateLike): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function trialEndFor(user: EntitlementUser): Date | null {
  if (normalizePlan(user.plan) !== "FREE") return null
  const explicit = toDate(user.trialEndsAt)
  if (explicit) return explicit
  const created = toDate(user.createdAt)
  return created
    ? new Date(created.getTime() + FREE_TRIAL_DAYS * DAY_MS)
    : null
}

export function entitlementsFor(
  user: EntitlementUser,
  now: Date = new Date()
): Entitlements {
  const plan = normalizePlan(user.plan)

  if (plan !== "FREE") {
    const limit = PLANS[plan].monthlyCredits ?? 0
    const resetAt = toDate(user.creditsResetAt)
    const resetDue = resetAt !== null && resetAt.getTime() <= now.getTime()
    const rawCredits = Math.max(0, user.credits ?? 0)
    const remaining = resetDue ? limit : Math.min(limit, rawCredits)

    return {
      plan,
      isPaid: true,
      isTrial: false,
      limit,
      remaining,
      used: Math.max(0, limit - remaining),
      trialEndsAt: null,
      trialDaysLeft: null,
      trialExpired: false,
      creditsResetAt: resetAt?.toISOString() ?? null,
      canGenerate: remaining > 0,
    }
  }

  const limit = PLANS.FREE.trialCredits ?? 0
  const used = Math.max(0, user.freeUsesCount ?? 0)
  const remaining = Math.max(0, limit - used)
  const trialEnd = trialEndFor(user)
  const trialExpired =
    trialEnd !== null && trialEnd.getTime() <= now.getTime()
  const trialDaysLeft = trialEnd
    ? trialExpired
      ? 0
      : Math.max(
          1,
          Math.ceil((trialEnd.getTime() - now.getTime()) / DAY_MS)
        )
    : null

  return {
    plan,
    isPaid: false,
    isTrial: true,
    limit,
    remaining,
    used,
    trialEndsAt: trialEnd?.toISOString() ?? null,
    trialDaysLeft,
    trialExpired,
    creditsResetAt: null,
    canGenerate: !trialExpired && remaining > 0,
  }
}
