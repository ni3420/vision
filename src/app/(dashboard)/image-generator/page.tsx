"use client"

import { useState } from "react"
import { History, Sliders } from "lucide-react"

import CreateImageForm from "@/features/image/components/create-image-form"
import ImageHistory from "@/features/image/components/image-history"
import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { entitlementsFor } from "@/lib/entitlements"
import { planDefinition } from "@/lib/plans"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "generate", label: "Generate", Icon: Sliders },
  { id: "history", label: "History", Icon: History },
] as const

const Page = () => {
  const [activeView, setActiveView] = useState<"generate" | "history">("generate")
  const { data } = useCurrentUser()

  const user = data?.data
  const entitlements = user ? entitlementsFor(user) : null
  const badge = !entitlements
    ? ""
    : entitlements.trialExpired
      ? "Trial ended · choose a plan"
      : entitlements.isPaid
        ? `${planDefinition(entitlements.plan).name} · ${entitlements.remaining} credits left`
        : `${entitlements.remaining} of ${entitlements.limit} free credits left`

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Image generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe the image, choose a size, generate.
          </p>
        </div>

        {user ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
            {badge}
          </span>
        ) : null}
      </header>

      <div
        role="group"
        aria-label="Image views"
        className="flex w-fit items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeView === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {activeView === "generate" ? <CreateImageForm /> : <ImageHistory />}
      </section>
    </div>
  )
}

export default Page
