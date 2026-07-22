"use client"

import React, { useState, useRef } from "react"
import { Music, Play, Pause, Clock, Sparkles, Loader2, Volume2 } from "lucide-react"
import { useGetMusicHistory } from "../api/use-get-music-history"

export const MusicHistory = () => {
  const { data: response, isLoading, isError } = useGetMusicHistory()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const tracks = response?.data || []

  const togglePlay = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const newAudio = new Audio(url)
      audioRef.current = newAudio
      newAudio.play()
      setPlayingId(id)

      newAudio.onended = () => {
        setPlayingId(null)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-card border border-border/60 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium mt-2">
          Retrieving audio composition history...
        </span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-card border border-destructive/20 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-destructive font-bold">
          Failed to load music history
        </span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border/60 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-100 dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Volume2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">
              Generated Tracks
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              {tracks.length} Audio Files Available
            </p>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-3">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
            <Sparkles className="h-6 w-6 text-primary/40 mb-2" />
            <p className="text-xs font-semibold">No music tracks generated yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Use the composer above to synthesize a track.
            </p>
          </div>
        ) : (
          tracks.map((track: any) => {
            const isPlaying = playingId === track._id

            return (
              <div
                key={track._id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                  isPlaying
                    ? "bg-primary/10 border-primary/40 shadow-sm"
                    : "bg-secondary/40 border-border/60 hover:bg-secondary/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => togglePlay(track._id, track.audioUrl)}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                      isPlaying
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground border border-border hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate leading-snug">
                      {track.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {track.duration}s
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(track.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <a
                  href={track.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-[10px] font-bold text-foreground hover:bg-secondary transition-colors shrink-0"
                >
                  Download
                </a>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default MusicHistory