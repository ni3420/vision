"use client"

import type { ReactNode } from "react"
import { CreditCard } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface BillingDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function BillingDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: BillingDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Base UI can report a close while mounting already-closed; only a
        // real dismissal of an open dialog should persist.
        if (!next && open) onClose()
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto sm:max-w-3xl",
          className
        )}
      >
        <DialogHeader className="pr-8">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
            <CreditCard className="size-3.5" />
            Billing
          </span>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  )
}

export default BillingDialog
