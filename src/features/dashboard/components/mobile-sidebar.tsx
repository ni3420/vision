"use client"

import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Menu, 
  LayoutDashboard, 
  ImageIcon, 
  Video, 
  MessageSquare, 
  Music, 
  Settings 
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import Plan from "@/components/plan"

const NAV_ITEMS = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "Image Generator",
    icon: ImageIcon,
    href: "/image-generator",
  },
  {
    label: "Video Generator",
    icon: Video,
    href: "/video-generator",
  },
  {
    label: "Conversation",
    icon: MessageSquare,
    href: "/conversation",
  },
  {
    label: "Music Generator",
    icon: Music,
    href: "/music-generator",
  },
]

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 md:hidden outline-none transition-all duration-200 cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>

      <SheetContent side="left" className="w-64 bg-white dark:bg-[#0d0c16] border-r border-slate-200/60 dark:border-slate-800/60 p-0 flex flex-col justify-between">
        <div>
          <SheetHeader className="h-16 border-b border-border/60 px-6 flex flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-violet-400 flex items-center justify-center text-white font-black text-sm">
                V
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">
                Vision
              </span>
            </SheetTitle>
          </SheetHeader>

          <nav className="p-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none group ${
                    isActive
                      ? "bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-500/10"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/40 space-y-1.5">
          <Plan />
{/* 
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none group ${
              pathname === "/settings"
                ? "bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            <span>Settings</span>
          </Link> */}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileSidebar