import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { LoginSchema } from "../schema";
import { User } from "@/models/user";

const app = new Hono();

app.post("/", zValidator("json", LoginSchema), async (c) => {
  try {
    const { email, name, userId } = c.req.valid("json");

    let user = await User.findOne({ userId });

    if (!user) {
      user = await User.create({
        email,
        name,
        userId,
      });

      return c.json(
        {
          msg: "User created successfully",
          data: user,
        },
        201
      );
    }

    return c.json(
      {
        msg: "User logged in successfully",
        data: user,
      },
      200
    );
  } catch (error) {
    console.error(error);

    return c.json(
      {
        msg: "Internal Server Error",
      },
      500
    );
  }
});

export default app;