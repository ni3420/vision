"use client"

import React from "react"
import CreateMusic from "@/features/music/components/create-music"
import MusicHistory from "@/features/music/components/music-history"
import { Music2, Sparkles } from "lucide-react"

const MusicPage = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Music2 className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Neural Music Studio
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Synthesize custom audio tracks, ambient soundscapes, and background scoring with AI.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/80 text-[11px] text-muted-foreground font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>MusicGen Engine</span>
          </div>
        </div>

        {/* Music Generator Input Section */}
        <section className="w-full">
          <CreateMusic />
        </section>

        {/* Music Generation History Section */}
        <section className="w-full pt-2">
          <MusicHistory />
        </section>

      </div>
    </div>
  )
}

export default MusicPage