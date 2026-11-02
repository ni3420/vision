import { describe, expect, it } from "bun:test";
import {
  CreateConversationSchema,
  PostMessageSchema,
  RenameConversationSchema,
} from "./schema";

describe("PostMessageSchema", () => {
  it("accepts a user message and a missing role", () => {
    expect(
      PostMessageSchema.safeParse({
        sessionId: "session_abc",
        message: { role: "user", content: "hello" },
      }).success
    ).toBe(true);

    expect(
      PostMessageSchema.safeParse({
        sessionId: "session_abc",
        message: { content: "hello" },
      }).success
    ).toBe(true);
  });

  it("rejects assistant and system roles", () => {
    for (const role of ["assistant", "system"] as const) {
      const result = PostMessageSchema.safeParse({
        sessionId: "session_abc",
        message: { role, content: "forged" },
      });

      expect(result.success).toBe(false);
    }
  });

  it("rejects empty and oversized content", () => {
    expect(
      PostMessageSchema.safeParse({ sessionId: "s", message: { content: "  " } }).success
    ).toBe(false);
    expect(
      PostMessageSchema.safeParse({
        sessionId: "s",
        message: { content: "x".repeat(4001) },
      }).success
    ).toBe(false);
  });
});

describe("CreateConversationSchema", () => {
  it("allows the server to generate the session id", () => {
    expect(CreateConversationSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a well-formed client id", () => {
    expect(
      CreateConversationSchema.safeParse({ sessionId: "session_1234abcd" }).success
    ).toBe(true);
  });

  it("rejects ids that do not match the expected format", () => {
    for (const sessionId of ["abc", "session_", "session_has space", "x".repeat(80)]) {
      expect(CreateConversationSchema.safeParse({ sessionId }).success).toBe(false);
    }
  });

  it("accepts an initial message from the legacy client shape", () => {
    const result = CreateConversationSchema.safeParse({
      initialMessage: { role: "user", content: "  hello  " },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.initialMessage?.content).toBe("hello");
    }
  });
});

describe("RenameConversationSchema", () => {
  it("trims and accepts a reasonable title", () => {
    const result = RenameConversationSchema.safeParse({ title: "  Launch copy  " });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Launch copy");
  });

  it("rejects blank and over-long titles", () => {
    expect(RenameConversationSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(RenameConversationSchema.safeParse({ title: "x".repeat(81) }).success).toBe(false);
  });
});
