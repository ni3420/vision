"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, Download, Eraser, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useBackgroundHistory,
  type BackgroundItem,
} from "../api/use-remove-background";
import { CHECKERBOARD_STYLE, downloadFile } from "../lib/download";

const SKELETON_COUNT = 6;

export const BackgroundHistory = () => {
  const { data, isPending, isError, refetch, isRefetching } =
    useBackgroundHistory();

  if (isPending) {
    return (
      <section className="space-y-3">
        <HistoryHeader />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div
              key={index}
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
            >
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
            </div>
          ))}
        </div>
      </section>
    );
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
            Couldn&apos;t load your cutouts
          </h3>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Check your connection and try again. Your cutouts are still saved.
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
    );
  }

  const items: BackgroundItem[] = data?.backgrounds ?? [];

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <HistoryHeader />
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
            <Eraser className="size-5" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            No cutouts yet
          </h3>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Removed backgrounds are saved here with their original for comparison.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <HistoryHeader count={items.length} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <HistoryCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};

function HistoryCard({ item }: { item: BackgroundItem }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const aspectRatio =
    item.width && item.height ? `${item.width} / ${item.height}` : "4 / 3";

  const handleDownload = async () => {
    try {
      await downloadFile(item.url, "vision-cutout.png");
    } catch {
      toast.error("Couldn't download the cutout. Try again.");
    }
  };

  return (
    <figure className="group overflow-hidden rounded-xl border border-border">
      <div
        className="relative"
        style={{
          ...(showOriginal ? {} : CHECKERBOARD_STYLE),
          aspectRatio,
        }}
      >
        <Image
          src={showOriginal ? item.sourceUrl : item.url}
          alt={
            showOriginal
              ? "Original image before background removal"
              : "Image with the background removed"
          }
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-contain"
          unoptimized
        />

        {item.mock ? (
          <span className="absolute left-2 top-2 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
            Mock
          </span>
        ) : null}
      </div>

      <figcaption className="flex items-center justify-between gap-2 border-t border-border bg-secondary/30 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
        <span className="truncate">
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowOriginal((value) => !value)}
            aria-pressed={showOriginal}
            className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showOriginal ? "Cutout" : "Original"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download cutout"
            className="flex size-5 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="size-3" />
          </button>
        </span>
      </figcaption>
    </figure>
  );
}

function HistoryHeader({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-muted-foreground">
        Recent cutouts
      </span>
      {count !== undefined ? (
        <span className="rounded-md border border-border bg-secondary/40 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
          {count} cutout{count === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

export default BackgroundHistory;
