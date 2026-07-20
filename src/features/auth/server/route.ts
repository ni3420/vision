import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { LoginSchema } from "../schema";
import { User } from "@/models/user.models";
import { getAuth } from "@clerk/hono";

const app = new Hono()
.post("/", zValidator("json", LoginSchema), async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth || !auth.userId) {
      return c.json({ success: false, error: "Unauthorized access vector" }, 401);
    }
    const { userId } = auth;
    const { email, name } = c.req.valid("json");

    let user = await User.findOne({ userId });

    if (!user) {
      user = await User.create({
        email,
        name,
        userId,
        plan: "FREE",
        freeUsesCount: 0,
      });

      return c.json(
        {
          success: true,
          msg: "User created successfully",
          data: user,
        },
        201
      );
    }

    return c.json(
      {
        success: true,
        msg: "User logged in successfully",
        data: user,
      },
      200
    );
  } catch (error: any) {
    console.error("Auth syncing framework execution exception:", error.message);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
})
.get("/current", async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth || !auth.userId) {
      return c.json({ success: false, error: "Unauthorized access vector" }, 401);
    }
    const { userId } = auth;

    const user = await User.findOne({ userId });
    if (!user) {
      return c.json({ success: false, error: "User configuration framework context not initialized" }, 404);
    }

    return c.json({
      success: true,
      data: user,
    }, 200);
  } catch (error: any) {
    console.error("Current user session synchronization exception:", error.message);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

export default app;