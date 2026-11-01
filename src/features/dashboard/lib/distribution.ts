export interface DistributionSlice {
  name: string
  value: number
  percent: number
  color: string
}

const COLORS = {
  conversations: "#6366f1",
  images: "#ec4899",
  music: "#8b5cf6",
}

export function buildDistribution(counts: {
  conversations: number
  images: number
  music: number
}): DistributionSlice[] {
  const total = counts.conversations + counts.images + counts.music

  const percent = (value: number) =>
    total === 0 ? 0 : Math.round((value / total) * 100)

  return [
    {
      name: "Conversations",
      value: counts.conversations,
      percent: percent(counts.conversations),
      color: COLORS.conversations,
    },
    {
      name: "Images",
      value: counts.images,
      percent: percent(counts.images),
      color: COLORS.images,
    },
    {
      name: "Music",
      value: counts.music,
      percent: percent(counts.music),
      color: COLORS.music,
    },
  ]
}
