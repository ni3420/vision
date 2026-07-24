"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, Zap, ShieldCheck, Crown, Loader2 } from "lucide-react"
import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { useCreateCheckout } from "@/features/Subscription/api/use-create-subscription"

interface PlanProps {
  onUpgradeClick?: () => void
}

export const Plan = ({ onUpgradeClick }: PlanProps) => {
  const { data: userResponse, isPending: isUserPending, isError } = useCurrentUser()
  const { mutate: handleCheckout, isPending: isCheckoutPending } = useCreateCheckout()

  const user = userResponse?.data
  const isPremium = user?.plan === "PRO"
  const maxCount = 5
  const currentCount = user?.freeUsesCount ?? 0
  const percentage = Math.min((currentCount / maxCount) * 100, 100)
  const isLimitReached = currentCount >= maxCount

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick()
    } else {
      handleCheckout({ json: {} })
    }
  }

  if (isUserPending) {
    return (
      <div className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 flex items-center justify-center min-h-[140px]">
        <Loader2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (isError || !userResponse?.success) {
    return (
      <div className="w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-4 text-center">
        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
          Failed to load plan details
        </span>
      </div>
    )
  }

  if (isPremium) {
    return (
      <div className="w-full bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 dark:from-indigo-950/30 dark:via-[#0d0c16] dark:to-transparent border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
            <Crown className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Pro Plan Active
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Unlimited Generations
            </p>
          </div>
        </div>

        {/* <button
          type="button"
          onClick={handleUpgrade}
          disabled={isCheckoutPending}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
        >
          {isCheckoutPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          )}
          <span>{isCheckoutPending ? "Redirecting..." : "Manage Subscription"}</span>
        </button> */}
      </div>
    )
  }

  return (
    <div className="w-full bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Free Plan
          </span>
        </div>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
            isLimitReached
              ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
              : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          {currentCount} / {maxCount} used
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isLimitReached
                ? "bg-red-500"
                : "bg-gradient-to-r from-indigo-500 to-violet-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          <span>{Math.max(0, maxCount - currentCount)} free frames remaining</span>
          {isLimitReached && (
            <span className="text-red-500 font-semibold">Limit Reached</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isCheckoutPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
      >
        {isCheckoutPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className="h-3.5 w-3.5 fill-current" />
        )}
        <span>{isCheckoutPending ? "Redirecting..." : "Upgrade to Pro"}</span>
      </button>

      <div className="flex items-center justify-center gap-1 pt-1 text-[10px] text-slate-400">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        <span>Secured with Stripe</span>
      </div>
    </div>
  )
}

export default Plan