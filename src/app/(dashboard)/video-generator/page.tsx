"use client"

import React from "react"
import { Video, Clock, ArrowLeft, ShieldCheck, ImageIcon } from "lucide-react"
import Link from "next/link"

const Page = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-xl mx-auto bg-card border border-border/60 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-slate-100 dark:shadow-none text-center relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5" />
          <span>Not available yet</span>
        </div>

        <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-primary/20 via-indigo-500/10 to-purple-500/20 border border-primary/30 flex items-center justify-center text-primary mx-auto shadow-lg shadow-primary/10 relative">
          <Video className="h-10 w-10 opacity-70" />
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center text-slate-300">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            AI Video Generator
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
            Video generation is not part of this build. Vision has no video provider configured,
            and no free, production-ready text-to-video API is wired in. This page stays visible
            so the product does not make promises it cannot keep.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
            <span className="text-[11px] font-bold text-foreground block">No provider wired</span>
            <span className="text-[10px] text-muted-foreground block">
              The image model in use is still-only
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
            <span className="text-[11px] font-bold text-foreground block">Paid by the second</span>
            <span className="text-[10px] text-muted-foreground block">
              Video inference has no verified free tier
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
            <span className="text-[11px] font-bold text-foreground block">Held in the roadmap</span>
            <span className="text-[10px] text-muted-foreground block">
              Gated until image unit economics are proven
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              href="/image-generator"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Generate images instead</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>No costs, no queue</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
