import { FREE_GENERATION_LIMIT } from "@/server/quota"

export type UsageKey = "chat" | "image" | "background"

export interface DailyUsage {
  date: string
  day: string
  chat: number
  image: number
  background: number
}

export interface FacetCounts {
  total: number
  buckets: Record<string, number>
}

export interface DashboardSnapshot {
  user: {
    plan: "FREE" | "PRO"
    freeUsesCount: number
    limit: number
    remaining: number | null
  }
  counts: {
    conversations: number
    images: number
    backgrounds: number
    total: number
  }
  weekly: DailyUsage[]
  generatedAt: string
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_MS = 24 * 60 * 60 * 1000

export function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

export function utcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function buildWeeklySeries(
  buckets: Partial<Record<UsageKey, Record<string, number>>>,
  now: Date
): DailyUsage[] {
  const today = startOfUtcDay(now)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - (6 - index) * DAY_MS)
    const key = utcDateKey(date)

    return {
      date: key,
      day: DAY_NAMES[date.getUTCDay()],
      chat: buckets.chat?.[key] ?? 0,
      image: buckets.image?.[key] ?? 0,
      background: buckets.background?.[key] ?? 0,
    }
  })
}

export function buildSnapshot(input: {
  plan?: string
  freeUsesCount?: number
  images: FacetCounts
  backgrounds: FacetCounts
  conversations: FacetCounts
  now: Date
}): DashboardSnapshot {
  const isPro = input.plan === "PRO"
  const used = Math.max(0, input.freeUsesCount ?? 0)

  return {
    user: {
      plan: isPro ? "PRO" : "FREE",
      freeUsesCount: used,
      limit: FREE_GENERATION_LIMIT,
      remaining: isPro ? null : Math.max(0, FREE_GENERATION_LIMIT - used),
    },
    counts: {
      conversations: input.conversations.total,
      images: input.images.total,
      backgrounds: input.backgrounds.total,
      total:
        input.conversations.total + input.images.total + input.backgrounds.total,
    },
    weekly: buildWeeklySeries(
      {
        chat: input.conversations.buckets,
        image: input.images.buckets,
        background: input.backgrounds.buckets,
      },
      input.now
    ),
    generatedAt: input.now.toISOString(),
  }
}
