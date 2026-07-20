"use client"

import React from "react"
import Image from "next/image"
import { Download, Sparkles, Loader2, AlertCircle, RefreshCw, LayoutGrid } from "lucide-react"
import { useImageHistory } from "../api/use-image-history"

export const ImageHistory = () => {
  const { data, isPending, isError, refetch } = useImageHistory()

  const handleDownload = async (imgUrl: string, index: number) => {
    try {
      const response = await fetch(imgUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `vision-history-${index + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to compile layout image file stream asset:", error)
    }
  }

  if (isPending) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[400px] bg-card border border-border/60 rounded-3xl p-8">
        <Loader2 className="h-6 w-6 text-primary animate-spin mb-3" />
        <p className="text-xs text-muted-foreground font-medium">
          Retrieving historical variant pipelines...
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[400px] bg-card border border-destructive/20 rounded-3xl p-8 gap-4">
        <div className="flex flex-col items-center text-center max-w-xs space-y-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Sync Error</h3>
          <p className="text-xs text-muted-foreground">
            Could not retrieve generation framework models from the active database cache.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 border rounded-xl transition-all duration-200 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Synchronization</span>
        </button>
      </div>
    )
  }

  const hasImages = data && data.images && data.images.length > 0

  if (!hasImages) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[400px] bg-card border border-dashed border-border/80 rounded-3xl p-8 text-center bg-secondary/10">
        <div className="max-w-xs space-y-3 flex flex-col items-center">
          <div className="h-11 w-11 rounded-xl bg-secondary/50 border border-border flex items-center justify-center text-muted-foreground/60">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Canvas Matrix Empty</h3>
          <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
            Your historic generation frames will appear here once compiled through the neural studio framework pipeline.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Historical Render Library
          </span>
        </div>
        <span className="text-xs font-bold bg-secondary border px-2.5 py-0.5 rounded-md text-foreground">
          {data.images.length} Compiled Variations
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {data.images.map((imgUrl: string, index: number) => (
          <div
            key={`${imgUrl}-${index}`}
            className="relative aspect-[232/300] w-full overflow-hidden rounded-2xl border border-border/80 shadow-md bg-secondary/20 transition-all duration-300 group hover:scale-[1.02] hover:border-primary/50"
          >
            <Image
              src={imgUrl}
              alt={`Historical Variant Output Index ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-white/90 tracking-wide">
                  #{index + 1}
                </span>
                
                <button
                  type="button"
                  onClick={() => handleDownload(imgUrl, index)}
                  className="p-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer"
                  aria-label="Export raw image stream matrix"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ImageHistory