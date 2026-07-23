"use client"

import React from "react"
import { Video, Sparkles, Clock, ArrowLeft, ShieldCheck } from "lucide-react"
import Link from "next/link"

const Page = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-xl mx-auto bg-card border border-border/60 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-slate-100 dark:shadow-none text-center relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>In Active Development</span>
        </div>

        <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-primary/20 via-indigo-500/10 to-purple-500/20 border border-primary/30 flex items-center justify-center text-primary mx-auto shadow-lg shadow-primary/10 relative">
          <Video className="h-10 w-10 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            AI Video Generator
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
            We're building a high-fidelity video synthesis pipeline. Text-to-video scoring, motion controls, and camera movement options are coming soon.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
            <span className="text-[11px] font-bold text-foreground block">Text to Video</span>
            <span className="text-[10px] text-muted-foreground block">4K resolution rendering</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
            <span className="text-[11px] font-bold text-foreground block">Motion Controls</span>
            <span className="text-[10px] text-muted-foreground block">Pan, tilt, and zoom controls</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
            <span className="text-[11px] font-bold text-foreground block">Fast Pipeline</span>
            <span className="text-[10px] text-muted-foreground block">GPU priority allocation</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Expected Release: Q3 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page