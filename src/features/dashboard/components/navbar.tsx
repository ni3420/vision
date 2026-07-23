"use client"

import React from "react"
import { UserButton } from "@clerk/nextjs"
import { Menu } from "lucide-react"

interface NavBarProps {
  onMenuClick?: () => void
}

const NavBar = ({ onMenuClick }: NavBarProps) => {
  return (
    <header className="h-16 w-full bg-white dark:bg-[#0d0c16] border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0 transition-all duration-300 relative z-10">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 md:hidden outline-none transition-all duration-200"
          aria-label="Toggle structural layout navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <UserButton />
      </div>
    </header>
  )
}

export default NavBar