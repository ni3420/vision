"use client"

import React, { useState } from "react"
import { Sparkles, History, Sliders } from "lucide-react"
import CreateImageForm from "@/features/image/components/create-image-form"
import ImageHistory from "@/features/image/components/image-history"

const Page = () => {
  const [activeView, setActiveView] = useState<"generate" | "history">("generate")

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-card border rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Neural Image Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch between the real-time structural prompt engine and your historic compiled generation models.
          </p>
        </div>

        <div className="flex items-center bg-secondary/60 border border-border/80 rounded-xl p-1 relative z-10 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveView("generate")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 outline-none cursor-pointer ${
              activeView === "generate"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Generate Studio</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveView("history")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 outline-none cursor-pointer ${
              activeView === "history"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Render History</span>
          </button>
        </div>
      </div>

      <div className="w-full transition-all duration-300">
        {activeView === "generate" ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CreateImageForm />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border rounded-3xl p-6 shadow-xl shadow-slate-100 dark:shadow-none">
              <ImageHistory />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Page