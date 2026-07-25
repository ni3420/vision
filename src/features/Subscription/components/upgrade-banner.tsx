"use client"

import React from "react"
import { Sparkles, ArrowRight, Zap } from "lucide-react"
import { useCreateCheckout } from "@/features/Subscription/api/use-create-subscription"

interface UpgradeBannerProps {
  title?: string
  description?: string
  buttonText?: string
  onUpgradeClick?: () => void
  className?: string
}

export const UpgradeBanner = ({
  title = "Unlock Unlimited AI Generations",
  description = "Upgrade to Vision Pro for priority access, zero latency, and unrestricted execution frames across all modalities.",
  buttonText = "Upgrade Now",
  onUpgradeClick,
  className = "",
}: UpgradeBannerProps) => {
  const { mutate: handleCheckout, isPending } = useCreateCheckout()

  const handleClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick()
    } else {
      handleCheckout({ json: {} })
    }
  }

  return (
    <div
      className={`w-full relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 ${className}`}
    >
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Vision Pro Engine</span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
            {title}
          </h2>

          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 group"
        >
          <Zap className="h-4 w-4 text-indigo-600 fill-current" />
          <span>{isPending ? "Redirecting..." : buttonText}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

export default UpgradeBanner