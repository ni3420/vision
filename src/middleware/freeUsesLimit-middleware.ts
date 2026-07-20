import { User } from '@/models/user.models'
import { getAuth } from '@clerk/hono'
import { createMiddleware } from 'hono/factory'

export const checkPlanLimit = createMiddleware(async (c, next) => {
  try {
    const auth = getAuth(c)
    if (!auth || !auth.userId) {
      return c.json({ success: false, error: "Unauthorized access vector" }, 401)
    }
    const { userId } = auth

    const userRecord = await User.findOne({ userId })
    
    if (!userRecord) {
      return c.json({ success: false, error: "User configuration framework context not initialized" }, 404)
    }

    if (userRecord.plan === "FREE" && userRecord.freeUsesCount >= 5) {
      return c.json({ 
        success: false, 
        error: "Exceeded structural trial provisioning allocation boundaries. Please upgrade to Premium." 
      }, 403)
    }

    c.set('userRecord', userRecord)
    await next()
  } catch (error: any) {
    console.error("Plan enforcement pipeline processing exception:", error.message)
    return c.json({ success: false, error: "Internal check verification engine crash" }, 500)
  }
})