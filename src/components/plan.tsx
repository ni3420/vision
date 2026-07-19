"use client"

import React from "react"
import { Sparkles, Zap, ShieldCheck } from "lucide-react"

interface PlanProps {
  currentCount?: number
  maxCount?: number
  onUpgradeClick?: () => void
}

export const Plan = ({ currentCount = 1, maxCount = 5, onUpgradeClick }: PlanProps) => {
  const percentage = Math.min((currentCount / maxCount) * 100, 100)
  const isLimitReached = currentCount >= maxCount

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
          <span>{maxCount - currentCount} generation frames remaining</span>
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