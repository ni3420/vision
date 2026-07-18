"use client";

import Image from "next/image";
import { Download, Loader2, AlertCircle, Sparkles } from "lucide-react";

interface ImageViewsProps {
  data?: {
    success: boolean;
    images: string[];
  };
  isPending: boolean;
  isError: boolean;
  dimensions: string;
}

const ImageViews = ({ data, isPending, isError, dimensions }: ImageViewsProps) => {
  const [widthStr, heightStr] = dimensions.split("*");
  const aspectWidth = parseInt(widthStr, 10) || 232;
  const aspectHeight = parseInt(heightStr, 10) || 300;

  const handleDownload = async (imgUrl: string, index: number) => {
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vision-studio-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to compile layout image file stream asset:", error);
    }
  };

  if (isPending) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[350px] bg-card border border-border/60 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.01] to-transparent pointer-events-none" />
        <div className="relative flex flex-col items-center max-w-sm text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-spin">
            <Loader2 className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Compiling Pipeline</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Allocating global neural engine cluster nodes. Generating visual frame variations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[350px] bg-card border border-destructive/20 rounded-3xl p-8">
        <div className="relative flex flex-col items-center max-w-sm text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Execution Halted</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The remote graphic render pipeline failed to fulfill the specification block parameters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.success || data.images.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[350px] bg-card border border-dashed border-border/80 rounded-3xl p-8 text-center bg-secondary/10">
        <div className="max-w-xs space-y-3 flex flex-col items-center">
          <div className="h-11 w-11 rounded-xl bg-secondary/50 border border-border flex items-center justify-center text-muted-foreground/60">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
            Configure system configurations above to render computational batch structures directly inside this interactive viewport.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Render Results Pipeline
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-md">
            {data.images.length} File{data.images.length > 1 ? "s" : ""} Compiled
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {data.images.map((imgUrl, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl border border-border/80 shadow-lg shadow-slate-100 dark:shadow-none bg-secondary/20 transition-all duration-300 group hover:scale-[1.01] hover:border-primary/50"
            style={{
              width: `${aspectWidth}px`,
              height: `${aspectHeight}px`,
              maxWidth: "100%",
            }}
          >
            <Image
              src={imgUrl}
              alt={`AI Variant Frame Output ${index + 1}`}
              fill
              sizes={`${aspectWidth}px`}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-bold text-white tracking-wide">
                  Variant #{index + 1}
                </span>
                
                <button
                  type="button"
                  onClick={() => handleDownload(imgUrl, index)}
                  className="p-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 border border-white/10 shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer"
                  aria-label="Export compiled vector stream"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageViews;