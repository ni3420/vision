"use client"

import { useSyncExternalStore } from "react"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const

type ThemeValue = (typeof OPTIONS)[number]["value"]

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  // next-themes reads the stored theme from localStorage during the client's
  // first render, while the server only has the default ("system"). Ignoring
  // `theme` until hydration finishes keeps that render identical to SSR.
  const hydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  )
  const current: ThemeValue =
    hydrated && (theme === "light" || theme === "dark") ? theme : "system"

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={`${label} theme`}
          aria-pressed={current === value}
          title={`${label} theme`}
          className={cn(
            "flex size-6 items-center justify-center rounded-[min(var(--radius-md),10px)] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            current === value && "bg-background text-foreground shadow-sm"
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}

export default ThemeToggle
