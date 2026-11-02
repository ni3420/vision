"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Download,
  Eraser,
  ImagePlus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import UpgradeModal from "@/features/Subscription/components/upgarde-model";
import {
  BACKGROUND_MAX_BYTES,
  type BackgroundMime,
} from "../schema";
import {
  useRemoveBackground,
  type BackgroundApiError,
} from "../api/use-remove-background";
import { describeBackgroundError } from "../lib/error-copy";
import { CHECKERBOARD_STYLE, downloadFile } from "../lib/download";

const ACCEPTED: BackgroundMime[] = ["image/png", "image/jpeg", "image/webp"];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const BackgroundStudio = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const { mutate, variables, data, error, isPending, isError, reset } =
    useRemoveBackground();
  const { data: userResponse } = useCurrentUser();
  const isPro = userResponse?.data?.plan === "PRO";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (next: File) => {
    if (!ACCEPTED.includes(next.type as BackgroundMime)) {
      setLocalError("Use a PNG, JPEG, or WebP image.");
      return;
    }

    if (next.size > BACKGROUND_MAX_BYTES) {
      setLocalError("Images must be 10 MB or smaller.");
      return;
    }

    setLocalError(null);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    reset();
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setLocalError(null);
    reset();
  };

  const handleMutationError = (err: BackgroundApiError) => {
    if (err?.status === 403) {
      setIsUpgradeModalOpen(true);
    }
  };

  const submit = () => {
    if (!file) return;
    mutate({ file }, { onError: handleMutationError });
  };

  const retry = () => {
    if (variables) {
      mutate(variables, { onError: handleMutationError });
    }
  };

  const background = data?.background;
  const aspectRatio =
    background?.width && background?.height
      ? `${background.width} / ${background.height}`
      : "4 / 3";

  const handleDownload = async () => {
    if (!background) return;

    try {
      await downloadFile(background.url, "vision-cutout.png");
    } catch {
      toast.error("Couldn't download the cutout. Try again.");
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Image
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              PNG, JPEG, or WebP · up to 10 MB
            </span>
          </div>

          {file && previewUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                <Image
                  src={previewUrl}
                  alt="Selected image"
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {file.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                disabled={isPending}
                aria-label="Remove selected image"
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="background-file"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) handleFile(dropped);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40"
              }`}
            >
              <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                <Upload className="size-5" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                Drop an image or browse
              </span>
              <span className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
                Product shots, portraits, and objects work best. You keep the original;
                only a copy is cut out.
              </span>
            </label>
          )}

          <input
            id="background-file"
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) handleFile(selected);
              event.target.value = "";
            }}
          />

          {localError ? (
            <p className="text-xs text-destructive">{localError}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Button
            type="button"
            onClick={submit}
            disabled={!file || isPending}
            className="h-11 w-full rounded-xl bg-gradient-to-b from-primary to-primary/80 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:from-primary/90 hover:to-primary/70"
          >
            <Eraser className="size-4" />
            {isPending ? "Removing background…" : "Remove background"}
            <span className="text-[11px] font-medium text-primary-foreground/80">
              · {isPro ? "no credit used" : "1 free generation"}
            </span>
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Failed removals don&apos;t use a credit.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Comparison
            </span>
            <div className="flex items-center gap-1.5">
              {data?.mock ? (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Local mock preview
                </span>
              ) : null}
              {background ? (
                <span className="rounded-md border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                  {background.provider} · {background.model}
                </span>
              ) : null}
            </div>
          </div>

          {isPending ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {["Original", "Cutout"].map((label) => (
                <div
                  key={label}
                  className="relative overflow-hidden rounded-xl border border-border bg-muted"
                  style={{ aspectRatio }}
                >
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-muted-foreground">
                    {label === "Cutout" ? "Removing background…" : label}
                  </span>
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorPanel error={error} onRetry={retry} />
          ) : !background || !previewUrl ? (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                <ImagePlus className="size-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                Your cutout appears here
              </h3>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Upload an image, then remove its background. Before and after are shown
                side by side.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <figure className="overflow-hidden rounded-xl border border-border">
                  <div className="relative bg-muted" style={{ aspectRatio }}>
                    <Image
                      src={previewUrl}
                      alt="Original image"
                      fill
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <figcaption className="border-t border-border bg-secondary/30 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
                    Before · original upload
                  </figcaption>
                </figure>

                <figure className="overflow-hidden rounded-xl border border-border">
                  <div
                    className="relative"
                    style={{ ...CHECKERBOARD_STYLE, aspectRatio }}
                  >
                    <Image
                      src={background.url}
                      alt="Image with the background removed"
                      fill
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <figcaption className="flex items-center justify-between border-t border-border bg-secondary/30 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
                    <span>After · transparent PNG</span>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center gap-1 rounded-md text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Download className="size-3" />
                      Download
                    </button>
                  </figcaption>
                </figure>
              </div>

              {data?.mock ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                  This is a local placeholder, not a Photoroom cutout. Set{" "}
                  <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                    PHOTOROOM_API_KEY
                  </code>{" "}
                  to enable real background removal.
                </p>
              ) : (
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Check fine edges, hair, and product labels before publishing.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </>
  );
};

function ErrorPanel({
  error,
  onRetry,
}: {
  error: BackgroundApiError | null;
  onRetry: () => void;
}) {
  const copy = describeBackgroundError(error);
  const technical = [copy.code, copy.retryable ? "retryable" : null]
    .filter(Boolean)
    .join(" · ");

  return (
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

      {copy.retryable ? (
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
  );
}

export default BackgroundStudio;
