import type { Model } from "mongoose"

import { Asset } from "@/models/asset.models"
import { Conversation } from "@/models/conversation.models"
import { Music } from "@/models/music.models"
import { User } from "@/models/user.models"
import { startOfUtcDay, type FacetCounts } from "./summary"

const DAY_MS = 24 * 60 * 60 * 1000
const SERIES_DAYS = 7

export interface DashboardData {
  user: { plan?: string; freeUsesCount?: number } | null
  images: FacetCounts
  music: FacetCounts
  conversations: FacetCounts
  now: Date
}

type FacetRow = {
  total: { count: number }[]
  weekly: { _id: string; count: number }[]
}

async function loadFacet<T>(
  model: Model<T>,
  match: Record<string, unknown>,
  since: Date
): Promise<FacetCounts> {
  const [row] = await model.aggregate<FacetRow>([
    { $match: match },
    {
      $facet: {
        total: [{ $count: "count" }],
        weekly: [
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ])

  return {
    total: row?.total[0]?.count ?? 0,
    buckets: Object.fromEntries(
      (row?.weekly ?? []).map((bucket) => [bucket._id, bucket.count])
    ),
  }
}

export async function loadDashboardData(
  userId: string,
  now: Date = new Date()
): Promise<DashboardData> {
  const since = startOfUtcDay(
    new Date(now.getTime() - (SERIES_DAYS - 1) * DAY_MS)
  )

  const [user, images, music, conversations] = await Promise.all([
    User.findOne({ userId })
      .select("plan freeUsesCount")
      .lean<{ plan?: string; freeUsesCount?: number } | null>(),
    loadFacet(Asset, { userId, kind: "image" }, since),
    loadFacet(Music, { userId }, since),
    loadFacet(Conversation, { userId }, since),
  ])

  return { user, images, music, conversations, now }
}
