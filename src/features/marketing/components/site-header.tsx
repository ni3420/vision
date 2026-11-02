"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Show } from "@clerk/nextjs"
import { ArrowUpRight, Menu, X } from "lucide-react"

import ThemeToggle from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

const primaryCta =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"

const quietCta =
  "inline-flex h-9 items-center justify-center rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Vision home"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-black text-white shadow-lg shadow-indigo-500/25">
            V
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Vision
          </span>
        </Link>

        <nav
          className="hidden items-center gap-0.5 md:flex"
          aria-label="Primary"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Show when="signed-out">
            <Link href="/auth/sign-in" className={quietCta}>
              Sign in
            </Link>
            <Link href="/auth/sign-up" className={primaryCta}>
              Start free
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className={quietCta}>
              Dashboard
            </Link>
            <Link href="/image-generator" className={primaryCta}>
              Create
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Show>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div
          id="marketing-mobile-nav"
          className="border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <Show when="signed-out">
                <Link href="/auth/sign-in" className={quietCta}>
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  onClick={() => setOpen(false)}
                  className={primaryCta}
                >
                  Start free
                </Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={primaryCta}
                >
                  Dashboard
                </Link>
              </Show>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default SiteHeader
