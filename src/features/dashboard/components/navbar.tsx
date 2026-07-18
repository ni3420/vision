"use client"

import React from "react";
import { UserButton } from "@clerk/nextjs";
import { 
  Sparkles, 
  Bell, 
  Menu, 
  Search, 
  Command,
  HelpCircle
} from "lucide-react";

interface NavBarProps {
  onMenuClick?: () => void;
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

        <div className="relative w-full hidden sm:block group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors duration-200 group-focus-within:text-indigo-500" />
          <input
            type="text"
            placeholder="Search engine actions or configurations..."
            className="w-full pl-10 pr-12 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 shadow-sm pointer-events-none select-none">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/20 dark:border-indigo-500/10 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wide text-indigo-600 dark:text-indigo-400 uppercase">
            Premium Pipeline
          </span>
        </div>

        <button
          type="button"
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent outline-none transition-all duration-200"
          aria-label="Documentation updates"
        >
          <HelpCircle className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent outline-none relative transition-all duration-200"
          aria-label="System configuration alerts"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </button>


          <UserButton
          />
      </div>
    </header>
  );
};

export default NavBar;