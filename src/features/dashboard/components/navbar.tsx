"use client"

import React from "react"
import { UserButton } from "@clerk/nextjs"
import MobileSidebar from "./mobile-sidebar"

const NavBar = () => {
  return (
    <header className="h-16 w-full bg-white dark:bg-[#0d0c16] border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0 transition-all duration-300 relative z-10">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <MobileSidebar />
      </div>

      <div className="flex items-center gap-3">
        <UserButton />
      </div>
    </header>
  )
}

export default NavBar