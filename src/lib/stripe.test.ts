import { afterEach, describe, expect, it } from "bun:test"

import { requestAppUrl } from "./stripe"

const originalNodeEnv = process.env.NODE_ENV
const originalAppUrl = process.env.APP_URL

function restore(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

function requestWith(headers: Record<string, string>) {
  return new Request("http://localhost:3000/api/billing/portal", {
    method: "POST",
    headers,
  })
}

afterEach(() => {
  restore("NODE_ENV", originalNodeEnv)
  restore("APP_URL", originalAppUrl)
})

describe("requestAppUrl", () => {
  it("uses the browser origin in development", () => {
    restore("NODE_ENV", "development")

    expect(
      requestAppUrl(
        requestWith({ origin: "https://aptitude-fantasize-scant.ngrok-free.dev" })
      )
    ).toBe("https://aptitude-fantasize-scant.ngrok-free.dev")
  })

  it("falls back to forwarded host headers without an origin", () => {
    restore("NODE_ENV", "development")

    expect(
      requestAppUrl(
        requestWith({
          "x-forwarded-host": "aptitude-fantasize-scant.ngrok-free.dev",
          "x-forwarded-proto": "https",
        })
      )
    ).toBe("https://aptitude-fantasize-scant.ngrok-free.dev")
  })

  it("ignores a malformed origin", () => {
    restore("NODE_ENV", "development")
    restore("APP_URL", "http://localhost:3000")

    expect(requestAppUrl(requestWith({ origin: "not a url" }))).toBe(
      "http://localhost:3000"
    )
  })

  it("keeps the configured URL in production", () => {
    restore("NODE_ENV", "production")
    restore("APP_URL", "https://vision.example.com/")

    expect(
      requestAppUrl(requestWith({ origin: "https://evil.example" }))
    ).toBe("https://vision.example.com")
  })
})
