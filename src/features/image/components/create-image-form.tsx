"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowUpRight } from "lucide-react"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/features/auth/api/use-current-user"
import UpgradeModal from "@/features/Subscription/components/upgarde-model"
import { cn } from "@/lib/utils"

import { imageGenerationSchema } from "../schema"
import { useCreateImage, type ApiError } from "../api/use-create-image"
import ImageViews from "./images-view"

type ImageGenerationFormValues = z.infer<typeof imageGenerationSchema>

const PROMPT_LIMIT = 1000

const RATIOS = [
  { value: "512*512", label: "Square", size: "512 × 512", glyph: { width: 15, height: 15 } },
  { value: "232*300", label: "Portrait", size: "232 × 300", glyph: { width: 12, height: 16 } },
  { value: "1024*576", label: "Wide", size: "1024 × 576", glyph: { width: 19, height: 11 } },
]

const QUICK_PROMPTS = [
  "Product shot on a clean white background",
  "Portrait at golden hour, 50mm lens",
  "Isometric illustration, soft pastel palette",
]

const VARIANTS = ["1", "2"]

export const CreateImageForm = () => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const { mutate, variables, data, error, isPending, isError } = useCreateImage()
  const { data: userResponse } = useCurrentUser()

  const isPro = userResponse?.data?.plan === "PRO"

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ImageGenerationFormValues>({
    resolver: zodResolver(imageGenerationSchema),
    defaultValues: {
      prompt: "",
      dimensions: "512*512",
      quantity: "1",
    },
  })

  const prompt = useWatch({ control, name: "prompt" })
  const dimensions = useWatch({ control, name: "dimensions" })
  const quantity = useWatch({ control, name: "quantity" })

  const variantCount = String(quantity) === "2" ? 2 : 1
  const costLabel = isPro
    ? "no credit used"
    : `uses ${variantCount} free generation${variantCount > 1 ? "s" : ""}`

  const handleMutationError = (err: ApiError) => {
    if (err?.status === 403) {
      setIsUpgradeModalOpen(true)
    }
  }

  const onSubmit = (values: ImageGenerationFormValues) => {
    mutate({ json: values }, { onError: handleMutationError })
  }

  const retry = () => {
    if (variables) {
      mutate(variables, { onError: handleMutationError })
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="image-prompt"
              className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
            >
              Prompt
            </label>
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {prompt.length} / {PROMPT_LIMIT}
            </span>
          </div>

          <Controller
            name="prompt"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="image-prompt"
                rows={4}
                maxLength={PROMPT_LIMIT}
                disabled={isPending}
                placeholder="A ceramic mug on a linen tablecloth, soft morning light, shallow depth of field"
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault()
                    void handleSubmit(onSubmit)()
                  }
                }}
                className="min-h-28 resize-none bg-background/60 text-sm leading-relaxed"
              />
            )}
          />

          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              <kbd className="rounded border border-border bg-secondary/60 px-1 py-0.5 font-sans">
                Ctrl + Enter
              </kbd>{" "}
              to generate
            </span>
            <span>Best results: subject, setting, lighting</span>
          </div>

          {errors.prompt ? (
            <p className="text-xs text-destructive">{errors.prompt.message}</p>
          ) : null}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isPending}
                onClick={() =>
                  setValue("prompt", example, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Size
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Variations
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 gap-1.5">
              {RATIOS.map((ratio) => {
                const active = dimensions === ratio.value

                return (
                  <button
                    key={ratio.value}
                    type="button"
                    disabled={isPending}
                    aria-pressed={active}
                    onClick={() =>
                      setValue("dimensions", ratio.value, { shouldValidate: true })
                    }
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-background hover:border-primary/40"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "rounded-[3px] border-[1.5px]",
                        active ? "border-primary" : "border-muted-foreground/50"
                      )}
                      style={{ width: ratio.glyph.width, height: ratio.glyph.height }}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {ratio.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground/80">{ratio.size}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex overflow-hidden rounded-xl border border-border">
              {VARIANTS.map((value) => {
                const active = String(quantity) === value

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending}
                    aria-pressed={active}
                    onClick={() => setValue("quantity", value, { shouldValidate: true })}
                    className={cn(
                      "flex-1 px-4 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:flex-none",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-xl bg-gradient-to-b from-primary to-primary/80 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:from-primary/90 hover:to-primary/70"
          >
            <ArrowUpRight className="size-4" />
            {isPending ? "Generating…" : "Generate"}
            <span className="text-[11px] font-medium text-primary-foreground/80">
              · {costLabel}
            </span>
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Failed generations don&apos;t use a credit.
          </p>
        </div>
      </form>

      <div className="mt-6">
        <ImageViews
          data={data}
          error={error}
          isPending={isPending}
          isError={isError}
          dimensions={dimensions}
          quantity={variantCount}
          onRetry={retry}
        />
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </>
  )
}

export default CreateImageForm
