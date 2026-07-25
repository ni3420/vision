"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentUser } from "@/features/auth/api/use-current-user"

export default function Success() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { data: userResponse, isLoading } = useCurrentUser()

  const isSuccess = searchParams.get("success") === "true"

  useEffect(() => {
    if (isSuccess) {
      // Invalidate cache so React Query re-fetches user status updated by the webhook
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
    }
  }, [isSuccess, queryClient])

  if (isLoading) return <div>Loading account...</div>

  return (
    <div>
      <h1>Plan: {userResponse?.data?.plan}</h1>
      {isSuccess && (
        <p className="text-emerald-500 font-bold">
          Payment successful! Your account is now PRO.
        </p>
      )}
    </div>
  )
}