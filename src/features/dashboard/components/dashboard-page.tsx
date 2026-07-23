"use client"

import React, { useMemo } from "react"
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts"
import { 
  Image as ImageIcon, Music, MessageSquare, Zap, Crown, ShieldCheck, Activity 
} from "lucide-react"

import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { useGetConversations } from "@/features/conversation/api/use-get-all-conversation"
import { useGetMusicHistory } from "@/features/music/api/use-get-music-history"
import { useImageHistory } from "@/features/image/api/use-image-history"
import Plan from "@/components/plan"
import { Skeleton } from "@/components/skeleton"

export const DashBoardPage = () => {
  const { data: userResponse, isLoading: userLoading } = useCurrentUser()
  const { data: conversationsResponse, isLoading: chatsLoading } = useGetConversations()
  const { data: musicResponse, isLoading: musicLoading } = useGetMusicHistory()
  const { data: imageResponse, isLoading: imageLoading } = useImageHistory()

  const user = userResponse?.data
  const conversations = conversationsResponse?.data || []
  const musicTracks = musicResponse?.data || []
  const imageGenerations = imageResponse?.data || []

  const isPremium = user?.plan === "PRO"
  const currentCount = user?.freeUsesCount ?? 0
  const maxCount = 5

  const totalConversations = conversations.length
  const totalImages = imageGenerations.length
  const totalMusic = musicTracks.length
  const totalGenerations = totalConversations + totalImages + totalMusic

  const distributionData = useMemo(() => {
    if (totalGenerations === 0) {
      return [
        { name: "Conversations", value: 0, color: "#6366f1" },
        { name: "Image Generations", value: 0, color: "#ec4899" },
        { name: "Music Scoring", value: 0, color: "#8b5cf6" },
      ]
    }

    return [
      {
        name: "Conversations",
        value: Math.round((totalConversations / totalGenerations) * 100),
        color: "#6366f1",
      },
      {
        name: "Image Generations",
        value: Math.round((totalImages / totalGenerations) * 100),
        color: "#ec4899",
      },
      {
        name: "Music Scoring",
        value: Math.round((totalMusic / totalGenerations) * 100),
        color: "#8b5cf6",
      },
    ]
  }, [totalConversations, totalImages, totalMusic, totalGenerations])

  const usageData = useMemo(() => {
    const daysMap: Record<string, { day: string; Chat: number; Image: number; Music: number }> = {}
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayName = daysOfWeek[d.getDay()]
      const key = d.toISOString().split("T")[0]
      daysMap[key] = { day: dayName, Chat: 0, Image: 0, Music: 0 }
    }

    conversations.forEach((item: any) => {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0]
      if (daysMap[dateKey]) {
        daysMap[dateKey].Chat += 1
      }
    })

    imageGenerations.forEach((item: any) => {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0]
      if (daysMap[dateKey]) {
        daysMap[dateKey].Image += 1
      }
    })

    musicTracks.forEach((item: any) => {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0]
      if (daysMap[dateKey]) {
        daysMap[dateKey].Music += 1
      }
    })

    return Object.values(daysMap)
  }, [conversations, imageGenerations, musicTracks])

  const isLoading = userLoading || chatsLoading || musicLoading || imageLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div className="space-y-2">
              <Skeleton className="h-6 w-56 rounded-xl" />
              <Skeleton className="h-3.5 w-80 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/60 rounded-3xl p-5 space-y-4">
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
                    <Skeleton className="h-4 w-60 rounded-lg" />
                    <Skeleton className="h-3 w-72 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>

              <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
                <Skeleton className="h-4 w-48 rounded-lg" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-2xl" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-56 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Vision Analytics Console
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time telemetry, model consumption metrics, and quota utilization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-secondary border border-border/80 text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Engine Status: Operational</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Live Data
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[11px] text-muted-foreground font-medium">Neural Conversations</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalConversations}</h3>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-full">
                Live Data
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[11px] text-muted-foreground font-medium">Images Synthesized</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalImages}</h3>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                <Music className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">
                Live Data
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[11px] text-muted-foreground font-medium">Music Tracks Scoring</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalMusic}</h3>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                {isPremium ? <Crown className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPremium ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
              }`}>
                {isPremium ? "PRO UNLIMITED" : "FREE TRIAL"}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[11px] text-muted-foreground font-medium">Remaining Trial Quota</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">
                {isPremium ? "∞" : `${Math.max(0, maxCount - currentCount)} / ${maxCount}`}
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Weekly Model Generation Velocity</h3>
                  <p className="text-xs text-muted-foreground">Execution density across all AI models over the past 7 days</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-indigo-500"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Chat</span>
                  <span className="flex items-center gap-1 text-pink-500"><span className="h-2 w-2 rounded-full bg-pink-500" /> Image</span>
                  <span className="flex items-center gap-1 text-purple-500"><span className="h-2 w-2 rounded-full bg-purple-500" /> Music</span>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="imageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "16px", border: "none", color: "#fff", fontSize: "12px" }} 
                    />
                    <Area type="monotone" dataKey="Chat" stroke="#6366f1" fillOpacity={1} fill="url(#chatGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Image" stroke="#ec4899" fillOpacity={1} fill="url(#imageGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground">Model Workload Distribution</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {distributionData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-2.5 rounded-2xl bg-secondary/40 border border-border/60">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-semibold text-foreground">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Plan />

            <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Security & Rate Limits</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Free plan users are restricted to 5 execution frames across all modalities. Upgrade to remove rate-limiting bottlenecks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashBoardPage