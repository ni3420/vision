"use client"

import Image from "next/image"
import { AlertCircle, Download, ImagePlus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { describeGenerationError, type GenerationErrorInfo } from "../lib/error-copy"
import { downloadImage } from "../lib/download"

export interface GeneratedImage {
  id: string
  url: string
  prompt?: string
  width?: number | null
  height?: number | null
  provider?: string
  model?: string
  createdAt?: string | Date
}

interface ImageViewsProps {
  data?: {
    success: boolean
    images: GeneratedImage[]
    mock?: boolean
  }
  error?: GenerationErrorInfo | null
  isPending: boolean
  isError: boolean
  dimensions: string
  quantity: number
  onRetry?: () => void
}

const ImageViews = ({
  data,
  error,
  isPending,
  isError,
  dimensions,
  quantity,
  onRetry,
}: ImageViewsProps) => {
  const [widthStr, heightStr] = dimensions.split(/[*x]/)
  const fallbackWidth = parseInt(widthStr, 10) || 512
  const fallbackHeight = parseInt(heightStr, 10) || 512
  const aspectRatio = `${fallbackWidth} / ${fallbackHeight}`

  const handleDownload = async (url: string, index: number) => {
    try {
      await downloadImage(url, `vision-image-${index + 1}.png`)
    } catch {
      toast.error("Couldn't download the image. Try again.")
    }
  }

  if (isPending) {
    return (
      <section className="space-y-3">
        <ResultsHeader label="Results" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: quantity }, (_, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-border bg-muted"
              style={{ aspectRatio }}
            >
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-muted-foreground">
                Generating…
              </span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (isError) {
    const copy = describeGenerationError(error)
    const technical = [copy.code, copy.retryable ? "retryable" : null]
      .filter(Boolean)
      .join(" · ")

    return (
      <section className="space-y-3">
        <ResultsHeader label="Results" />
        <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{copy.title}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {copy.message}
            </p>
            {technical ? (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                {technical}
              </p>
            ) : null}
          </div>

          {copy.retryable && onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw />
              Try again
            </Button>
          ) : null}
        </div>
      </section>
    )
  }

  if (!data || !data.success || data.images.length === 0) {
    return (
      <section className="space-y-3">
        <ResultsHeader label="Results" />
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
            <ImagePlus className="size-5" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            Your images appear here
          </h3>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Describe an image above and press Generate. Results are saved to your
            history.
          </p>
        </div>
      </section>
    )
  }

  const first = data.images[0]
  const modelTag = first?.provider && first?.model ? `${first.provider} · ${first.model}` : null

  return (
    <section className="space-y-3">
      <ResultsHeader
        label="Results"
        count={data.images.length}
        tag={modelTag}
        mock={data.mock}
      />

      <div className="grid grid-cols-2 gap-3">
        {data.images.map((image, index) => {
          const width = image.width ?? fallbackWidth
          const height = image.height ?? fallbackHeight

          return (
            <figure
              key={image.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-muted"
            >
              <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
                <Image
                  src={image.url}
                  alt={
                    image.prompt
                      ? `Generated image: ${image.prompt.slice(0, 80)}`
                      : `Generated image ${index + 1}`
                  }
                  fill
                  sizes="(max-width: 640px) 50vw, 360px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />

                {data.mock ? (
                  <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    Mock
                  </span>
                ) : null}

                <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 via-transparent to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
                  <span className="text-[11px] font-semibold text-white">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownload(image.url, index)}
                    aria-label={`Download image ${index + 1}`}
                    className="flex size-7 items-center justify-center rounded-lg bg-white text-slate-900 shadow transition-transform active:scale-95"
                  >
                    <Download className="size-3.5" />
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

function ResultsHeader({
  label,
  count,
  tag,
  mock,
}: {
  label: string
  count?: number
  tag?: string | null
  mock?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-muted-foreground">
        {label}
        {count !== undefined ? ` · ${count}` : ""}
      </span>

      <div className="flex items-center gap-1.5">
        {mock ? (
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Local mock preview
          </span>
        ) : null}
        {tag ? (
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
            {tag}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default ImageViews
