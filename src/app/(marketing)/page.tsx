import type { Metadata } from "next"

import { LandingPage } from "@/features/marketing/components/landing-page"

export const metadata: Metadata = {
  title: {
    absolute: "Vision — AI creative workspace",
  },
  description:
    "Generate images, remove backgrounds, and refine ideas in one private workspace. One credit per request, failed requests refunded.",
}

export default function Page() {
  return <LandingPage />
}
