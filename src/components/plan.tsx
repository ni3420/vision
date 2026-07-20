"use client"

import React from "react"
import { Sparkles, Zap, ShieldCheck, Crown, Loader2 } from "lucide-react"
import {  useCurrentUser} from "@/features/auth/api/use-current-user"

interface PlanProps {
  onUpgradeClick?: () => void
}

export const Plan = ({ onUpgradeClick }: PlanProps) => {
  const { data: userResponse, isPending, isError } = useCurrentUser()
  
  if (isPending) {
    return (
      <div className="w-full max-w-sm bg-card border border-border/60 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[180px]">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium mt-2">
          Syncing quota telemetry...
        </span>
      </div>
    )
  }

  if (isError || !userResponse?.success) {
    return (
      <div className="w-full max-w-sm bg-card border border-destructive/20 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[180px]">
        <span className="text-xs text-destructive font-bold">
          Quota Synchronization Failed
        </span>
      </div>
    )
  }

  console.log(userResponse)

  const user = userResponse.data
  const isPremium = user.plan === "PRO"
  const maxCount = 5
  const currentCount = user.freeUsesCount ?? 0
  const percentage = Math.min((currentCount / maxCount) * 100, 100)
  const isLimitReached = currentCount >= maxCount

  if (isPremium) {
    return (
      <div className="w-full max-w-sm bg-card border border-border/60 rounded-3xl p-5 shadow-xl shadow-slate-100 dark:shadow-none relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Vision Premium Engine
            </span>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block mt-0.5">
              Active Subscription
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border/60 text-xs text-muted-foreground font-medium leading-relaxed">
          Your account holds unrestricted execution frame processing permissions. Global GPU pipeline nodes are fully prioritized.
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Enterprise Secure Context</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm bg-card border border-border/60 rounded-3xl p-5 shadow-xl shadow-slate-100 dark:shadow-none relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Free Trial Sandbox
            </span>
            <span className="text-[10px] text-muted-foreground font-medium block">
              Neural Allocation Tier
            </span>
          </div>
        </div>
        
        <span className="text-xs font-bold bg-secondary border border-border px-2 py-0.5 rounded-md text-foreground">
          {currentCount} / {maxCount}
        </span>
      </div>

      <div className="space-y-2">
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border/40">
          <div 
            className="h-full bg-gradient-to-r from-primary to-indigo-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-[11px] text-muted-foreground font-medium">
          <span>{Math.max(0, maxCount - currentCount)} generation frames remaining</span>
          {isLimitReached && <span className="text-destructive font-bold">Quota Exceeded</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={onUpgradeClick}
        className="w-full mt-4 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-primary-foreground text-xs font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 group outline-none focus:ring-4 focus:ring-primary/20 cursor-pointer"
      >
        <Zap className="h-3.5 w-3.5 fill-current" />
        <span>Upgrade to Premium Engine</span>
      </button>

      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>Secure Account Provisioning</span>
      </div>
    </div>
  )
}

export default Plan