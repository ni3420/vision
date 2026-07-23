"use client"

import React, { useState } from "react"
import { Music, Wand2, Loader2, Clock } from "lucide-react"
import { toast } from "sonner"
import { useCreateMusic } from "../api/use-music-genrate"

export const CreateMusic = () => {
  const [prompt, setPrompt] = useState("")
  const [duration, setDuration] = useState(8)

  const { mutate, isPending } = useCreateMusic()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isPending) return

    mutate(
      {
        json: {
          prompt: prompt.trim(),
          duration,
        },
      },
      {
        onSuccess: () => {
          toast.success("Audio track generated successfully!")
          setPrompt("")
        },
        onError: (error: any) => {
          const status = error?.status || error?.response?.status
          const errorMessage = error?.message || ""

          if (
            status === 403 || 
            status === 504 || 
            errorMessage.includes("403") || 
            errorMessage.includes("504") ||
            errorMessage.toLowerCase().includes("timeout")
          ) {
            toast.error("Treblo API server error. Please try again later.")
          } else {
            toast.error(errorMessage || "Failed to generate music track. Please try again.")
          }
        },
      }
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border/60 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-100 dark:shadow-none relative overflow-hidden">
      <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <Music className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            Neural Audio Composer
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-md uppercase tracking-wide">
              Music Gen
            </span>
          </h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            Generate original background tracks, synthwave beats, or cinematic scoring
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prompt Input */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Upbeat lofi hip-hop beat with chill piano melody and rain sounds..."
            rows={3}
            disabled={isPending}
            className="w-full bg-secondary/50 border border-border/80 rounded-2xl p-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200 resize-none disabled:opacity-60"
          />
        </div>

        {/* Options & Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Duration Selector */}
          <div className="flex items-center gap-2 bg-secondary/40 border border-border/60 rounded-xl px-3 py-2 shrink-0">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground">
              Duration:
            </span>
            <div className="flex items-center gap-1">
              {[8, 15, 20].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  disabled={isPending}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                    duration === sec
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!prompt.trim() || isPending}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-primary-foreground text-xs font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-md shadow-primary/10"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Synthesizing Audio...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Generate Track</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateMusic