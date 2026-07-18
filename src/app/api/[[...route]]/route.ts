import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import ImageRouter from "@/features/image/server/route"
const app = new Hono().basePath('/api')
.route("/image",ImageRouter)


export const GET = handle(app)
export const POST = handle(app)

export type AppType=typeof app