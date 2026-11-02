"use client"

import React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  Crown,
  Eraser,
  Image as ImageIcon,
  Info,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react"

import Plan from "@/components/plan"
import { Skeleton } from "@/components/skeleton"
import { useDashboardSummary } from "@/features/dashboard/api/use-get-dashboard-summary"
import { buildDistribution } from "@/features/dashboard/lib/distribution"

const UsageChart = dynamic(
  () => import("./usage-chart").then((mod) => mod.UsageChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full rounded-2xl bg-secondary/40 animate-pulse" />,
  }
)

const DistributionChart = dynamic(
  () => import("./distribution-chart").then((mod) => mod.DistributionChart),
  {
    ssr: false,
    loading: () => <div className="h-48 w-full rounded-2xl bg-secondary/40 animate-pulse" />,
  }
)

const QUICK_ACTIONS = [
  { label: "New image", href: "/image-generator", icon: ImageIcon },
  { label: "Start chat", href: "/conversation", icon: MessagesSquare },
  { label: "Remove background", href: "/background-studio", icon: Eraser },
]

const STAT_TONES = {
  indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  pink: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
} as const

const WEEKLY_SERIES = [
  { label: "Chat", color: "bg-indigo-500" },
  { label: "Image", color: "bg-pink-500" },
  { label: "Background", color: "bg-teal-500" },
]

interface StatCardProps {
  label: string
  value: React.ReactNode
  badge: string
  icon: typeof ImageIcon
  tone: keyof typeof STAT_TONES
}

const StatCard = ({ label, value, badge, icon: Icon, tone }: StatCardProps) => (
  <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div
        className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${STAT_TONES[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full border border-border/60">
        {badge}
      </span>
    </div>
    <div className="mt-4">
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <h3 className="text-2xl font-black text-foreground mt-0.5">{value}</h3>
    </div>
  </div>
)

const DashboardSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-card border border-border/60 rounded-3xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-52 rounded-lg" />
              <Skeleton className="h-3 w-64 rounded-md" />
            </div>
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
      <div className="lg:col-span-4 space-y-6">
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
      </div>
    </div>
  </div>
)

const StartHere = () => (
  <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-8 space-y-5">
    <div className="space-y-1">
      <h3 className="text-sm font-bold text-foreground">Nothing generated yet</h3>
      <p className="text-xs text-muted-foreground">
        Your activity chart fills in after your first generation. Start with any tool:
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-center justify-between p-4 rounded-2xl bg-secondary/40 border border-border/60 hover:border-primary/30 hover:bg-secondary/70 transition-colors"
        >
          <span className="flex items-center gap-2.5 text-xs font-bold text-foreground">
            <action.icon className="h-4 w-4 text-primary" />
            {action.label}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      ))}
    </div>
  </div>
)

export const DashBoardPage = () => {
  const { data, isPending, isError, isFetching, refetch } = useDashboardSummary()
  const snapshot = data?.data

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Every image, conversation, and cutout in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="px-3 py-1.5 rounded-full bg-secondary border border-border/80 text-[11px] font-bold text-foreground hover:border-primary/30 hover:bg-secondary/70 transition-colors flex items-center gap-1.5"
              >
                <action.icon className="h-3.5 w-3.5 text-primary" />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {isPending && <DashboardSkeleton />}

        {isError && !isPending && (
          <div
            role="alert"
            className="bg-card border border-rose-200 dark:border-rose-900/40 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground">
                Could not load your dashboard
              </h2>
              <p className="text-xs text-muted-foreground">
                The summary request failed. Your data is safe; try again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>{isFetching ? "Retrying..." : "Retry"}</span>
            </button>
          </div>
        )}

        {snapshot && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Images generated"
                value={snapshot.counts.images}
                badge="All time"
                icon={ImageIcon}
                tone="pink"
              />
              <StatCard
                label="Conversations"
                value={snapshot.counts.conversations}
                badge="All time"
                icon={MessagesSquare}
                tone="indigo"
              />
              <StatCard
                label="Backgrounds removed"
                value={snapshot.counts.backgrounds}
                badge="All time"
                icon={Eraser}
                tone="teal"
              />
              <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${STAT_TONES.amber}`}
                  >
                    {snapshot.user.isPaid ? (
                      <Crown className="h-5 w-5" />
                    ) : (
                      <Zap className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full border border-border/60">
                    {snapshot.user.plan}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Credits left
                  </p>
                  <h3 className="text-2xl font-black text-foreground mt-0.5">
                    {snapshot.user.trialExpired
                      ? "Trial ended"
                      : `${snapshot.user.remaining} / ${snapshot.user.limit}`}
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                {snapshot.counts.total === 0 ? (
                  <StartHere />
                ) : (
                  <>
                    <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-foreground">
                            Activity · last 7 days
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Generations per day, grouped by UTC date.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-semibold">
                          {WEEKLY_SERIES.map((series) => (
                            <span
                              key={series.label}
                              className="flex items-center gap-1 text-muted-foreground"
                            >
                              <span className={`h-2 w-2 rounded-full ${series.color}`} />
                              {series.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <UsageChart data={snapshot.weekly} />
                    </div>

                    <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-4">
                      <h2 className="text-sm font-bold text-foreground">Workload split</h2>
                      <DistributionChart data={buildDistribution(snapshot.counts)} />
                    </div>
                  </>
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                <Plan />

                <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Usage rules</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Free accounts get {snapshot.user.limit} trial credits across
                    images, conversations, and background cutouts. Basic and Pro
                    include a monthly credit allowance. Each request counts once,
                    even when it returns two images.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Activity className="h-3 w-3 text-primary" />
                    <span>
                      Updated {new Date(snapshot.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!isPending && !isError && !snapshot && (
          <div className="bg-card border border-border/60 rounded-3xl p-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary" />
            <span>No summary available yet.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashBoardPage
