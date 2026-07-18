"use client"

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  MessageSquare, 
  Music, 
  Settings, 
  ChevronLeft,
  LayoutDashboard,
  LogOut
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
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
];

const SideBar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-white dark:bg-[#0d0c16] border-r border-slate-200/60 dark:border-slate-800/60 shrink-0 transition-all duration-300 relative z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/40 gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-400 flex items-center justify-center shadow-md shadow-indigo-500/20 dark:shadow-indigo-500/10">
          <Sparkles className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block leading-none">
            Vision
          </span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mt-0.5 block">
            Studio Engine
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

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
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
              }`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800/40 space-y-1.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none group ${
            pathname === "/settings"
              ? "bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Settings className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>Settings</span>
        </Link>

        <button
          type="button"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 transition-all duration-200 outline-none text-left"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default SideBar;