import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { LoginSchema } from "../schema";
import { User } from "@/models/user.models";
import { getAuth } from "@clerk/hono";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const app = new Hono()
.post("/", zValidator("json", LoginSchema), async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth || !auth.userId) {
      return c.json({ success: false, error: "Unauthorized access vector" }, 401);
    }
    const { userId } = auth;
    const { email, name } = c.req.valid("json");
    const displayName = name.trim() || email.split("@")[0] || "User";

    const existingById = await User.findOne({ userId });

    if (existingById) {
      return c.json(
        {
          success: true,
          msg: "User logged in successfully",
          data: existingById,
        },
        200
      );
    }

    // A re-created Clerk account keeps the verified email but gets a new userId.
    // Re-link the existing profile so its plan and quota survive instead of
    // failing the unique email index.
    const reLinked = await User.findOneAndUpdate(
      { email },
      { $set: { userId, name: displayName } },
      { new: true }
    );

    if (reLinked) {
      return c.json(
        {
          success: true,
          msg: "User logged in successfully",
          data: reLinked,
        },
        200
      );
    }

    try {
      const created = await User.create({
        email,
        name: displayName,
        userId,
        plan: "FREE",
        freeUsesCount: 0,
      });

      return c.json(
        {
          success: true,
          msg: "User created successfully",
          data: created,
        },
        201
      );
    } catch (error: unknown) {
      // Two first-time syncs can race on the unique userId index.
      if ((error as { code?: number }).code === 11000) {
        const raced = await User.findOne({ userId });
        if (raced) {
          return c.json(
            {
              success: true,
              msg: "User logged in successfully",
              data: raced,
            },
            200
          );
        }
      }
      throw error;
    }
  } catch (error: unknown) {
    console.error(
      "Auth syncing framework execution exception:",
      errorMessage(error, "unknown error")
    );
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
  } catch (error: unknown) {
    console.error(
      "Current user session synchronization exception:",
      errorMessage(error, "unknown error")
    );
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

export default app;