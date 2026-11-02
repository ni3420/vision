import type { Context } from "hono"
import { Hono } from "hono"
import { getAuth } from "@clerk/hono"

import { buildSnapshot } from "./summary"
import { loadDashboardData, type DashboardData } from "./service"

type DashboardLoader = (userId: string) => Promise<DashboardData>
type UserResolver = (c: Context) => string | null

function clerkUser(c: Context): string | null {
  return getAuth(c)?.userId ?? null
}

export function createDashboardRouter(options: {
  load?: DashboardLoader
  resolveUserId?: UserResolver
} = {}) {
  const load = options.load ?? loadDashboardData
  const resolveUserId = options.resolveUserId ?? clerkUser

  return new Hono().get("/summary", async (c) => {
    const userId = resolveUserId(c)
    if (!userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      )
    }

    try {
      const data = await load(userId)

      if (!data.user) {
        return c.json(
          {
            success: false,
            code: "USER_NOT_INITIALIZED",
            error: "User profile is not initialized yet",
          },
          404
        )
      }

      return c.json(
        {
          success: true,
          data: buildSnapshot({
            plan: data.user.plan,
            freeUsesCount: data.user.freeUsesCount,
            images: data.images,
            backgrounds: data.backgrounds,
            conversations: data.conversations,
            now: data.now,
          }),
        },
        200
      )
    } catch (error) {
      console.error("Dashboard summary failed:", error)
      return c.json(
        {
          success: false,
          code: "DASHBOARD_SUMMARY_FAILED",
          error: "Failed to load dashboard summary",
        },
        500
      )
    }
  })
}

export default createDashboardRouter()
