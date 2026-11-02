"use client"

import { useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"

import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { entitlementsFor } from "@/lib/entitlements"

import { UpgradeDialog } from "./upgrade-dialog"

// v2 resets dismissals written spuriously when a closed dialog reported a
// mount-time close before the open-state guard was added.
const STORAGE_KEY = "vision:trial-ended-dismissed:v2"

let dismissedInMemory = false
const listeners = new Set<() => void>()

function readDismissed() {
  if (dismissedInMemory) return true
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function dismiss() {
  dismissedInMemory = true
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1")
  } catch {
    // Private mode can reject storage writes; the in-memory flag still holds
    // for this page load.
  }
  for (const listener of listeners) listener()
}

// The server cannot read sessionStorage, so it assumes the dialog is already
// dismissed and the client re-renders once hydration confirms otherwise.
const getServerSnapshot = () => true

export function TrialEndedDialog() {
  const pathname = usePathname()
  const dismissed = useSyncExternalStore(
    subscribe,
    readDismissed,
    getServerSnapshot
  )
  const { data } = useCurrentUser()
  const entitlements = data?.data ? entitlementsFor(data.data) : null

  const blocked =
    entitlements !== null && !entitlements.isPaid && !entitlements.canGenerate
  const open =
    blocked &&
    !dismissed &&
    !pathname.startsWith("/billing")

  return <UpgradeDialog open={open} onClose={dismiss} />
}

export default TrialEndedDialog
