"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  messageCount: number
  isDeleting: boolean
  onConfirm: () => void
}

export function DeleteConversationDialog({
  open,
  onOpenChange,
  title,
  messageCount,
  isDeleting,
  onConfirm,
}: DeleteConversationDialogProps) {
  const detail =
    messageCount === 0
      ? "This chat has no messages."
      : `${messageCount} message${messageCount === 1 ? "" : "s"} will be removed.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this chat?</DialogTitle>
          <DialogDescription>
            “{title}” will be deleted. {detail} This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {isDeleting ? "Deleting…" : "Delete chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteConversationDialog
