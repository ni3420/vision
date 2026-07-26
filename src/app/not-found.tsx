import Link from "next/link"
import { Bot, ArrowLeft, Sparkles, AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto text-center space-y-6 relative z-10">
        {/* Animated Bot Avatar Container */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
          <div className="relative h-20 w-20 rounded-3xl bg-card border border-border/80 flex items-center justify-center shadow-2xl shadow-primary/10">
            <Bot className="h-10 w-10 text-primary animate-bounce" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Status Badge & Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-primary" />
            Error 404 • Signal Lost
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Neural Context Not Found
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            The page or session path you are attempting to locate does not exist or has been re-indexed.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/25 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}