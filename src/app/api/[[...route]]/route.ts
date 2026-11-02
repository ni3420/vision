export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // or 'edge' if using edge runtime
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import ImageRouter from "@/features/image/server/route"
import BackgroundRouter from "@/features/background/server/route"
import authRouter from "@/features/auth/server/route"
import billingRouter from "@/features/billing/server/route"
import { DB } from '@/db/db'
import conversationRouter from "@/features/conversation/server/route"
import assetsRouter from "@/features/assets/server/route"
import dashboardRouter from "@/features/dashboard/server/route"
import { clerkMiddleware } from '@clerk/hono'



const app = new Hono().basePath('/api')
.use("*",clerkMiddleware({publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}))
.use("*", async (c, next) => {
  try {
    await DB();
    return next();
  } catch (error) {
    console.error("Database connection failed:", error);
    return c.json({ error: "Database connection failed" }, 500);
  }
})
.route("/auth", authRouter)
.route("/image", ImageRouter)
.route("/background", BackgroundRouter)
.route("/conversation",conversationRouter)
.route("/dashboard", dashboardRouter)
.route("/assets", assetsRouter)
.route("/billing", billingRouter)



export const GET = handle(app)
export const POST = handle(app)
export const DELETE=handle(app)
export const PATCH=handle(app)

export type AppType = typeof app