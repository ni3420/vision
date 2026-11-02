"use client";

import { useState } from "react";
import { Eraser, History, Sliders } from "lucide-react";

import BackgroundStudio from "@/features/background/components/background-studio";
import BackgroundHistory from "@/features/background/components/background-history";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import { FREE_GENERATION_LIMIT } from "@/lib/plans";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "studio", label: "Studio", Icon: Sliders },
  { id: "history", label: "History", Icon: History },
] as const;

const Page = () => {
  const [activeView, setActiveView] = useState<"studio" | "history">("studio");
  const { data } = useCurrentUser();

  const user = data?.data;
  const isPro = user?.plan === "PRO";
  const remaining = Math.max(
    0,
    FREE_GENERATION_LIMIT - (user?.freeUsesCount ?? 0)
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Background studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Remove an image background and keep a transparent PNG.
          </p>
        </div>

        {user ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
            {isPro
              ? "Pro · no free-tier cap"
              : `${remaining} of ${FREE_GENERATION_LIMIT} free left`}
          </span>
        ) : null}
      </header>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Eraser className="size-3.5 text-primary" />
        <span>Cutouts are produced by remove.bg and stored privately.</span>
      </div>

      <div
        role="group"
        aria-label="Background views"
        className="flex w-fit items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeView === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {activeView === "studio" ? <BackgroundStudio /> : <BackgroundHistory />}
      </section>
    </div>
  );
};

export default Page;
