import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import ImageRouter from "@/features/image/server/route"
import authRouter from "@/features/auth/server/route"
import { DB } from '@/db/db'
const app = new Hono().basePath('/api')
.route("/image",ImageRouter)
.route("/auth",authRouter)

DB().then(()=>{
    console.log("connect the mongodb")
}).catch(()=>{
    console.log("error do not connected")
})
export const GET = handle(app)
export const POST = handle(app)

export type AppType=typeof app