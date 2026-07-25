"use client"

import React, { useEffect } from "react"
import { X, Crown, CheckCircle2, ShieldCheck } from "lucide-react"
import UpgradeBanner from "./upgrade-banner"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export const UpgradeModal = ({ isOpen, onClose }: UpgradeModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative z-10 w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shrink-0">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Upgrade Your Vision Workspace
            </h3>
            <p className="text-xs text-muted-foreground">
              Select your plan tier to eliminate rate limits and access priority GPU processing.
            </p>
          </div>
        </div>

        <UpgradeBanner />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-foreground">Unlimited Generations</span>
          </div>
          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-foreground">Priority Execution</span>
          </div>
          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-foreground">Zero Latency Queue</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Encrypted payment process powered by Stripe</span>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal