"use client"

import React from "react"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl animate-pulse" />
        
        <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10 transition-transform duration-300">
          <span className="text-white text-xl font-black tracking-tighter select-none">
            V
          </span>
        </div>

        <div className="absolute -inset-3 rounded-3xl border border-dashed border-primary/30 animate-[spin_8s_linear_infinite]" />
      </div>

      <div className="mt-6 flex flex-col items-center text-center space-y-1.5">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          <span className="text-sm font-bold tracking-tight text-foreground">
            Synchronizing Workspace
          </span>
        </div>
        <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
          Connecting to secure neural distribution matrices...
        </p>
      </div>
    </div>
  )
}