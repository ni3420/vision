import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

const FOOTER_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link
              href="/"
              className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-black text-white">
                V
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Vision
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A private AI creative workspace for generating images, removing
              backgrounds, and refining ideas in conversation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Product
              </p>
              <ul className="mt-4 space-y-2.5">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Account
              </p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href="/auth/sign-in"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/sign-up"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link
                    href="/billing"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Billing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Project
              </p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href="https://github.com/ni3420/vision"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    GitHub
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Vision. All rights reserved.</p>
          <p>Next.js · Cloudflare Workers AI · Stripe · Clerk</p>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
