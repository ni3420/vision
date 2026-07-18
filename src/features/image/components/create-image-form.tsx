"use client"

import React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Input from "@/components/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { imageGenerationSchema } from "../schema"
import { useCreateImage } from "../api/use-create-image"
import ImageViews from "./images-view"

type ImageGenerationFormValues = z.infer<typeof imageGenerationSchema>

const PRESET_SIZES = [
  { label: "Book Cover (232×300)", value: "232*300" },
  { label: "Square Studio (512×512)", value: "512*512" },
  { label: "Cinematic HD (1024×576)", value: "1024*576" },
]

const QUANTITY_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  label: `${i + 1} Variation${i > 0 ? "s" : ""}`,
  value: String(i + 1),
}))

export const CreateImageForm = () => {
  const { mutate, data, isPending, isError } = useCreateImage()

  const { control, watch } = useForm<ImageGenerationFormValues>({
    resolver: zodResolver(imageGenerationSchema),
    defaultValues: {
      prompt: "",
      dimensions: "232*300",
      quantity: "1",
    }
  })

  const selectedDimensions = watch("dimensions")
  const currentQuantity = watch("quantity")

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return

    mutate({
      json: {
        prompt: text,
        dimensions: selectedDimensions,
        quantity: currentQuantity,
      },
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="w-full flex flex-col md:flex-row items-end md:items-center gap-3 bg-card border border-border/60 rounded-3xl p-3 shadow-lg">
        <div className="flex-1 w-full">
          <Input 
            onSendMessage={handleSendMessage}
            placeholder="Describe your design framework..."
            disabled={isPending}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Controller
            name="dimensions"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                <SelectTrigger className="w-full md:w-[180px] h-11 bg-secondary/50 rounded-xl px-3 text-xs font-semibold">
                  <SelectValue placeholder="Select Size" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value} className="text-xs font-medium">
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                <SelectTrigger className="w-full md:w-[130px] h-11 bg-secondary/50 rounded-xl px-3 text-xs font-semibold">
                  <SelectValue placeholder="Count" />
                </SelectTrigger>
                <SelectContent>
                  {QUANTITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <ImageViews 
        data={data}
        isPending={isPending}
        isError={isError}
        dimensions={selectedDimensions}
      />
    </div>
  )
}

export default CreateImageForm;