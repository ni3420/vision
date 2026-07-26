"use client"

import React, { forwardRef, useState, useRef } from "react"
import { Mic, MicOff, CornerDownLeft } from "lucide-react"

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSendMessage: (text: string) => void
  onVoiceRecord?: (audioBlob: Blob) => void
  placeholder?: string
  disabled?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ onSendMessage, onVoiceRecord, placeholder = "Type a message...", disabled, ...props }, ref) => {
    const [inputValue, setInputValue] = useState("")
    const [isRecording, setIsRecording] = useState(false)
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
    }

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
          onVoiceRecord?.(audioBlob)
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error("Failed to access peripheral microphone architecture:", err)
      }
    }

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
      }
    }

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!inputValue.trim()) return

      onSendMessage(inputValue.trim())
      setInputValue("")
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleFormSubmit(e)
      }
    }

    return (
      <div className="w-full">
        <form 
          onSubmit={handleFormSubmit}
          className={`flex items-center gap-2 p-2 rounded-2xl bg-card border shadow-lg shadow-slate-100 dark:shadow-none focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <input
            type="text"
            ref={ref}
            value={inputValue}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Capturing stream transmission audio..." : placeholder}
            disabled={disabled || isRecording}
            className="flex-1 min-w-0 bg-transparent py-2 px-3 text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none disabled:cursor-not-allowed"
            {...props}
          />

          {onVoiceRecord && (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled}
              className={`p-3 rounded-xl transition-all duration-200 shrink-0 active:scale-95 cursor-pointer ${
                isRecording 
                  ? "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              aria-label={isRecording ? "Halt voice sequence" : "Initialize voice compilation"}
            >
              {isRecording ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
            </button>
          )}

          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className="p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-30 disabled:hover:opacity-30 active:scale-95 transition-all duration-200 shrink-0 flex items-center justify-center cursor-pointer"
            aria-label="Dispatch frame execution"
          >
            <CornerDownLeft className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    )
  }
)

Input.displayName = "Input"
export default Input