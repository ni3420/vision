"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DailyUsage } from "../server/summary"

const SERIES = [
  { key: "chat", label: "Chat", color: "#6366f1" },
  { key: "image", label: "Image", color: "#ec4899" },
  { key: "background", label: "Background", color: "#14b8a6" },
] as const

export function UsageChart({ data }: { data: DailyUsage[] }) {
  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {SERIES.map((series) => (
              <linearGradient
                key={series.key}
                id={`${series.key}Grad`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={series.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={series.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey="day"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              borderRadius: "16px",
              border: "none",
              color: "#fff",
              fontSize: "12px",
            }}
          />
          {SERIES.map((series) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              fillOpacity={1}
              fill={`url(#${series.key}Grad)`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
