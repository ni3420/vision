import { Suspense } from "react"
import { Loader2 } from "lucide-react"

import BillingPage from "@/features/billing/components/billing-page"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-border/60 bg-card">
          <Loader2 className="size-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      }
    >
      <BillingPage />
    </Suspense>
  )
}
