import Image from "next/image"
import Link from "next/link"
import { Show } from "@clerk/nextjs"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Eraser,
  ImageIcon,
  KeyRound,
  Layers,
  LockKeyhole,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react"

import { PLAN_IDS, PLANS } from "@/lib/plans"

const STATS = [
  { value: "1 credit", label: "per image request, chat reply, or cutout" },
  { value: "3 tools", label: "generate, cut out, and converse" },
  { value: "Private", label: "signed URLs and ownership checks" },
  { value: "Refunded", label: "failed requests don’t cost credits" },
]

const RATIOS = [
  { label: "Square", detail: "512 × 512", width: "48%", ratio: "1 / 1" },
  { label: "Portrait", detail: "232 × 300", width: "38%", ratio: "232 / 300" },
  { label: "Wide", detail: "1024 × 576", width: "70%", ratio: "1024 / 576" },
]

const STEPS = [
  {
    number: "01",
    title: "Describe the shot",
    copy: "Start with a prompt, or bring a rough idea to the assistant and leave with a sharper one.",
    icon: MessageSquare,
  },
  {
    number: "02",
    title: "Generate a frame",
    copy: "Pick square, portrait, or wide. Ask for one image or two variations for the same credit.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Refine the result",
    copy: "Cut the subject out, or talk through the next direction before you spend another credit.",
    icon: Eraser,
  },
  {
    number: "04",
    title: "Take it with you",
    copy: "Download the asset from a signed URL. Everything stays in your history, ready to revisit.",
    icon: Download,
  },
]

const GALLERY = [
  {
    src: "/landing/portrait.webp",
    alt: "Editorial portrait with a polished chrome headpiece",
    title: "Editorial portrait",
    direction: "Chrome, softbox light, cool tones",
  },
  {
    src: "/landing/product.webp",
    alt: "Amber glass perfume bottle on travertine",
    title: "Product scene",
    direction: "Amber glass, travertine, hard sun",
  },
  {
    src: "/landing/arch.webp",
    alt: "Monolithic stone arch at dawn",
    title: "Architecture study",
    direction: "Monolith, dawn haze, wide frame",
  },
]

const FAQS = [
  {
    question: "What counts as a credit?",
    answer:
      "One credit per image request, one per chat reply, and one per background cutout. Asking for two image variations still reserves a single credit.",
  },
  {
    question: "What happens when a request fails?",
    answer:
      "Credits are reserved before the work starts and released when a request fails, so a failed job is refunded automatically. A retry takes a fresh reservation and cannot double-charge an earlier attempt.",
  },
  {
    question: "Who can see my images?",
    answer:
      "Your uploads and generated assets are private by default. Downloads use short-lived signed URLs, and every read checks that the asset belongs to you.",
  },
  {
    question: "Which models power the studio?",
    answer:
      "Images come from Cloudflare Workers AI FLUX.2 klein 4B. Conversation runs on Groq gpt-oss-120b with a Gemini fallback, and background removal is handled by remove.bg.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Every new account starts with 5 credits for 7 days. No card is required to create an account or try the studio.",
  },
  {
    question: "Can I change or cancel my plan?",
    answer:
      "Yes. Paid plans are managed through the Stripe billing portal, where you can switch plans or cancel without contacting support.",
  },
]

function SectionIntro({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string
  title: string
  copy: string
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3.5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
        {copy}
      </p>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="overflow-x-clip">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-24 sm:pt-28 lg:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-40 size-72 rounded-full bg-fuchsia-500/10 blur-3xl dark:bg-fuchsia-500/15"
        />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-14 lg:pb-16">
          <div className="lg:pt-6">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              AI creative workspace
            </span>

            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              From prompt to{" "}
              <span className="block bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-indigo-300 dark:via-violet-300 dark:to-fuchsia-300">
                finished image.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Vision is a private studio for generating images, cutting out
              backgrounds, and refining ideas in conversation — with honest
              credits and results you can actually use.
            </p>

            <div className="mt-9 flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <Show when="signed-out">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
                >
                  Start free — 5 credits
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <a
                  href="#workflow"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background/60 px-7 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-muted"
                >
                  See how it works
                  <ArrowDownRight className="size-4" aria-hidden="true" />
                </a>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/image-generator"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
                >
                  Open the studio
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background/60 px-7 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-muted"
                >
                  Go to dashboard
                </Link>
              </Show>
            </div>

            <p className="mt-6 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs text-muted-foreground">
              <span>7-day trial</span>
              <span aria-hidden="true" className="size-1 rounded-full bg-border" />
              <span>No card required</span>
              <span aria-hidden="true" className="size-1 rounded-full bg-border" />
              <span>Cancel anytime</span>
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-[440px] lg:justify-self-end">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-indigo-500/25 via-violet-500/10 to-fuchsia-500/25 blur-2xl"
            />

            <div className="relative rounded-[2rem] border border-border/70 bg-card/80 p-2.5 shadow-2xl shadow-indigo-950/10 backdrop-blur dark:shadow-black/40">
              <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background/70">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="size-2.5 rounded-full bg-rose-400/80" />
                    <span className="size-2.5 rounded-full bg-amber-400/80" />
                    <span className="size-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    vision / studio
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <LockKeyhole className="size-2.5" aria-hidden="true" />
                    Private
                  </span>
                </div>

                <div className="relative aspect-[4/5] w-full lg:aspect-[5/6]">
                  <Image
                    src="/landing/hero.webp"
                    alt="Iridescent glass flower blooming on deep indigo silk"
                    fill
                    priority
                    sizes="(min-width: 1024px) 34vw, 90vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-black/55 p-4 text-white shadow-lg backdrop-blur-xl">
                    <p className="text-xs leading-relaxed text-white/90">
                      “Iridescent glass flower on deep indigo silk, soft studio
                      light, macro detail”
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[10px] text-white/75">
                        <span className="rounded-full border border-white/15 px-2.5 py-0.5">
                          Portrait
                        </span>
                        <span className="rounded-full border border-white/15 px-2.5 py-0.5">
                          1 credit
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-black">
                        <Sparkles className="size-3" aria-hidden="true" />
                        Generate
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 p-3">
                  {[
                    { src: "/landing/product.webp", label: "Product" },
                    { src: "/landing/portrait.webp", label: "Portrait" },
                    { src: "/landing/arch.webp", label: "Scene" },
                  ].map((thumb) => (
                    <div key={thumb.src} className="space-y-2">
                      <div className="relative aspect-square overflow-hidden rounded-xl border border-border/60">
                        <Image
                          src={thumb.src}
                          alt=""
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                      <p className="text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {thumb.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -left-5 top-28 hidden items-center gap-2 rounded-full border border-border/70 bg-background/95 px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur sm:flex">
              <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
              Job succeeded
            </div>
            <div className="absolute -right-4 top-1/2 hidden items-center gap-2 rounded-full border border-border/70 bg-background/95 px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur sm:flex">
              <KeyRound className="size-3.5 text-indigo-500" aria-hidden="true" />
              Signed URL ready
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="relative border-y border-border/60 bg-card/30">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-5 py-10 sm:px-8 lg:grid-cols-4 lg:gap-12">
            {STATS.map((stat) => (
              <div key={stat.value}>
                <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT / BENTO SECTION */}
      <section id="product" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <SectionIntro
            eyebrow="The studio"
            title="Everything between idea and export."
            copy="No model picker, no empty panels, no dead buttons. Three focused tools that hand work to each other, backed by a ledger that tells you exactly what each request costs."
          />

          <div className="mt-12 grid gap-6 sm:mt-14 md:grid-cols-3">
            <article className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card/60 p-7 sm:p-9 md:col-span-2">
              <div>
                <span className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-primary">
                  <ImageIcon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">
                  Generate with direction
                </h3>
                <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Write the shot, choose a frame, and get one image or two
                  variations. Every run keeps its prompt and settings in your
                  history.
                </p>
              </div>

              <div className="mt-8 grid flex-1 grid-cols-3 gap-3.5">
                {RATIOS.map((ratio) => (
                  <div
                    key={ratio.label}
                    className="flex flex-col justify-between rounded-2xl border border-border/60 bg-background/50 p-4"
                  >
                    <div className="flex min-h-24 flex-1 items-center justify-center">
                      <span
                        className="rounded-md border border-dashed border-primary/40 bg-primary/5"
                        style={{ width: ratio.width, aspectRatio: ratio.ratio }}
                      />
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-semibold">{ratio.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {ratio.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-3xl border border-border/70 bg-card/60 p-7 sm:p-9">
              <div>
                <span className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-primary">
                  <Eraser className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">
                  Cut out in one pass
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  Upload a product or portrait and download a clean PNG cutout.
                  Before and after sit side by side, with the provider named.
                </p>
              </div>

              <div className="mt-8">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/60">
                  <Image
                    src="/landing/product.webp"
                    alt="Amber perfume bottle used as a background-removal example"
                    fill
                    sizes="(min-width: 768px) 24vw, 90vw"
                    className="object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-medium text-white backdrop-blur">
                    remove.bg
                  </span>
                </div>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-3xl border border-border/70 bg-card/60 p-7 sm:p-9">
              <div>
                <span className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-primary">
                  <MessageSquare className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">
                  Talk it through
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  Bring a vague idea to the assistant and leave with a prompt
                  that is ready for the generator.
                </p>
              </div>

              <div className="mt-8 space-y-3 text-xs">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-background">
                  Make it warmer, less glossy.
                </p>
                <p className="max-w-[92%] rounded-2xl rounded-bl-md border border-border/60 bg-background/70 px-3.5 py-2.5 leading-relaxed text-muted-foreground">
                  Try a softer key light and a limestone backdrop. Keep the
                  amber glass as the anchor.
                </p>
              </div>
            </article>

            <article className="rounded-3xl border border-border/70 bg-card/60 p-7 sm:p-9 md:col-span-2">
              <div className="flex h-full flex-col justify-between gap-8 sm:flex-row sm:items-center">
                <div className="max-w-sm">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-primary">
                    <Layers className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">
                    Credits you can audit
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    Every charge is reserved first, settled on success, and
                    refunded when a request fails. Retries cannot double-charge
                    an earlier attempt.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <ShieldCheck
                      className="size-4 text-emerald-500"
                      aria-hidden="true"
                    />
                    One ledger for images, chat, and cutouts
                  </div>
                </div>

                <div className="w-full max-w-xs shrink-0 rounded-2xl border border-border/60 bg-background/60 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Recent activity
                    </p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                      Live
                    </span>
                  </div>
                  <div className="mt-4 divide-y divide-border/60">
                    {[
                      {
                        label: "Image request",
                        meta: "2 variations",
                        delta: "−1",
                        tone: "text-muted-foreground",
                      },
                      {
                        label: "Failed generation",
                        meta: "Refunded",
                        delta: "+1",
                        tone: "text-emerald-600 dark:text-emerald-400",
                      },
                      {
                        label: "Basic plan refill",
                        meta: "Monthly",
                        delta: "+100",
                        tone: "text-emerald-600 dark:text-emerald-400",
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                      >
                        <div>
                          <p className="text-xs font-medium">{row.label}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {row.meta}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold tabular-nums ${row.tone}`}
                        >
                          {row.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-border/60 bg-card/30 px-6 py-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <LockKeyhole
                className="size-3.5 text-indigo-500"
                aria-hidden="true"
              />
              Private uploads by default
            </span>
            <span className="inline-flex items-center gap-2">
              <WandSparkles
                className="size-3.5 text-violet-500"
                aria-hidden="true"
              />
              Cloudflare Workers AI FLUX.2 klein
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck
                className="size-3.5 text-emerald-500"
                aria-hidden="true"
              />
              Stripe-verified billing webhooks
            </span>
          </div>
        </div>
      </section>

      {/* WORKFLOW SECTION */}
      <section
        id="workflow"
        className="scroll-mt-24 border-y border-border/60 bg-card/30 py-20 sm:py-24 lg:py-28"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <SectionIntro
            eyebrow="The workflow"
            title="A shorter path to something usable."
            copy="Four steps, no detours. Each one is built around a real request — not a demo that stops at the download button."
          />

          <div className="mt-12 grid gap-10 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border/60">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className={`relative ${
                    index > 0
                      ? "border-t border-border/60 pt-8 sm:border-t-0 sm:pt-0"
                      : ""
                  } lg:px-8 first:lg:pl-0 last:lg:pr-0`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-xs font-semibold tabular-nums text-primary">
                      {step.number}
                    </span>
                    <span className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold tracking-tight sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* GALLERY SECTION */}
      <section id="gallery" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro
              eyebrow="The output"
              title="Made to be used."
              copy="A studio should produce assets, not screenshots. Three directions from the same workspace."
            />
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              Sample imagery produced for this page. Your results depend on the
              prompt and the configured model.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 lg:pb-8">
            {GALLERY.map((item, index) => (
              <figure
                key={item.title}
                className={`group ${index === 1 ? "lg:translate-y-8" : ""}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border/70 bg-muted">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-medium text-white backdrop-blur">
                    1 credit
                  </span>
                </div>
                <figcaption className="mt-4 flex items-start justify-between gap-3 px-1">
                  <div>
                    <p className="text-sm font-semibold tracking-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.direction}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section
        id="pricing"
        className="scroll-mt-24 border-y border-border/60 bg-card/30 py-20 sm:py-24 lg:py-28"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <SectionIntro
            eyebrow="Pricing"
            title="Pay for the work, not the seats."
            copy="One credit per request, whatever the tool. Failed requests are refunded, and every plan is managed through the Stripe billing portal."
          />

          <div className="mt-12 grid gap-6 sm:mt-14 lg:grid-cols-3 lg:gap-8">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id]
              const isPaid = plan.priceMonthlyUsd > 0
              const credits = plan.monthlyCredits ?? plan.trialCredits ?? 0
              const creditLine = plan.monthlyCredits
                ? `${credits} credits every month`
                : `${credits} credits for ${plan.trialDays} days`

              return (
                <article
                  key={id}
                  className={`relative flex flex-col rounded-3xl border p-7 sm:p-9 ${
                    plan.highlighted
                      ? "border-primary/40 bg-card shadow-xl shadow-indigo-950/5 dark:bg-card/80"
                      : "border-border/70 bg-card/60"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground">
                      Most popular
                    </span>
                  )}

                  <p className="text-base font-semibold tracking-tight">
                    {plan.name}
                  </p>
                  <p className="mt-2 min-h-10 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                    {plan.tagline}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      ${plan.priceMonthlyUsd}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isPaid ? "/ month" : "to start"}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs font-medium text-primary">
                    {creditLine}
                  </p>

                  <ul className="mt-8 flex-1 space-y-3 border-t border-border/60 pt-6">
                    {isPaid && (
                      <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                        Everything in the studio
                      </li>
                    )}
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-xs text-muted-foreground"
                      >
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                    {isPaid && (
                      <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                        Private assets and signed downloads
                      </li>
                    )}
                  </ul>

                  <div className="mt-8 pt-2">
                    <Show when="signed-out">
                      <Link
                        href={
                          isPaid
                            ? "/auth/sign-up?redirect_url=%2Fbilling"
                            : "/auth/sign-up"
                        }
                        className={`flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                          plan.highlighted
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border border-border bg-background hover:bg-muted"
                        }`}
                      >
                        {isPaid ? `Choose ${plan.name}` : "Start free"}
                      </Link>
                    </Show>
                    <Show when="signed-in">
                      <Link
                        href={isPaid ? "/billing" : "/image-generator"}
                        className={`flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                          plan.highlighted
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border border-border bg-background hover:bg-muted"
                        }`}
                      >
                        {isPaid ? "View plans in billing" : "Open the studio"}
                      </Link>
                    </Show>
                  </div>
                </article>
              )
            })}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Prices in USD. Switch plans or cancel from the Stripe billing portal.
          </p>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <SectionIntro
              eyebrow="Questions"
              title="The details that matter."
              copy="Straight answers about credits, failures, privacy, and the models behind the studio."
            />
            <Link
              href="/auth/sign-up"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Start with 5 free credits
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="border-t border-border/60">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group border-b border-border/60 py-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium outline-none transition-colors hover:text-foreground/80 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <Plus
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="max-w-2xl pt-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground px-8 py-16 text-background sm:px-14 sm:py-20 lg:p-24">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-indigo-500/30 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 left-10 size-72 rounded-full bg-fuchsia-500/20 blur-3xl"
            />

            <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-background/60">
                  Start in the studio
                </p>
                <h2 className="mt-4 max-w-xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Your next image is five credits away.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-background/70">
                  Create an account, keep the prompts you like, and see exactly
                  what each request costs.
                </p>
              </div>

              <div className="flex flex-col gap-3.5 sm:flex-row">
                <Show when="signed-out">
                  <Link
                    href="/auth/sign-up"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-7 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
                  >
                    Start free
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-background/25 px-7 text-sm font-semibold text-background transition-colors hover:bg-background/10"
                  >
                    Sign in
                  </Link>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/image-generator"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-7 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
                  >
                    Open the studio
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-background/25 px-7 text-sm font-semibold text-background transition-colors hover:bg-background/10"
                  >
                    Go to dashboard
                  </Link>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage