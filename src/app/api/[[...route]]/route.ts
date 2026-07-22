import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import ImageRouter from "@/features/image/server/route"
import authRouter from "@/features/auth/server/route"
import musicRouter from "@/features/music/server/route"
import { DB } from '@/db/db'
import conversationRouter from "@/features/conversation/server/route"
import { clerkMiddleware } from '@clerk/hono'


const app = new Hono().basePath('/api')
.use("*",clerkMiddleware({publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}))
.route("/auth", authRouter)
.route("/image", ImageRouter)
.route("/conversation",conversationRouter)
.route("/music",musicRouter)

DB()
  .then(() => {
    console.log("connect the mongodb")
  })
  .catch((err) => {
    console.error("error do not connected:", err)
  })

export const GET = handle(app)
export const POST = handle(app)
export const DELETE=handle(app)
export const PATCH=handle(app)

export type AppType = typeof app