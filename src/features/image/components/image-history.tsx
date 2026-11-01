"use client"

import Image from "next/image"
import { AlertCircle, Download, ImageIcon, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useImageHistory } from "../api/use-image-history"
import { downloadImage } from "../lib/download"
import type { GeneratedImage } from "./images-view"

const SKELETON_COUNT = 8

export const ImageHistory = () => {
  const { data, isPending, isError, refetch, isRefetching } = useImageHistory()

  const handleDownload = async (url: string, index: number) => {
    try {
      await downloadImage(url, `vision-history-${index + 1}.png`)
    } catch {
      toast.error("Couldn't download the image. Try again.")
    }
  }

  if (isPending) {
    return (
      <section className="space-y-3">
        <HistoryHeader />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div
              key={index}
              className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted"
            >
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-3">
        <HistoryHeader />
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 p-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            Couldn&apos;t load your history
          </h3>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Check your connection and try again. Your images are still saved.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="mt-3"
          >
            <RefreshCw />
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </section>
    )
  }

  const images: GeneratedImage[] = data?.images ?? []

  if (images.length === 0) {
    return (
      <section className="space-y-3">
        <HistoryHeader />
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
            <ImageIcon className="size-5" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-foreground">No images yet</h3>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Images you generate are saved here with the prompt and settings used.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <HistoryHeader count={images.length} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => {
          const width = image.width ?? 232
          const height = image.height ?? 300

          return (
            <figure
              key={image.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-muted"
              title={image.prompt || undefined}
            >
              <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
                <Image
                  src={image.url}
                  alt={image.prompt || `Historical image ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />

                <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
                  <span className="text-[10px] font-semibold text-white">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownload(image.url, index)}
                    aria-label={`Download image ${index + 1}`}
                    className="flex size-6 items-center justify-center rounded-md bg-white text-slate-900 shadow transition-transform active:scale-95"
                  >
                    <Download className="size-3" />
                  </button>
                </div>
              </div>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

function HistoryHeader({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-muted-foreground">
        History
      </span>
      {count !== undefined ? (
        <span className="rounded-md border border-border bg-secondary/40 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
          {count} image{count === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  )
}

export default ImageHistory
