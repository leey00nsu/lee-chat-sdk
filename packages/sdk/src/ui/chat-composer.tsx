'use client'

import type { FormEvent, KeyboardEvent } from 'react'

export interface ChatComposerProps {
  inputId: string
  label: string
  value: string
  placeholder: string
  submitLabel: string
  isLoading?: boolean
  maximumLength?: number
  onChange: (nextValue: string) => void
  onSubmit: () => void
}

const CHAT_COMPOSER_KEY = {
  ENTER: 'Enter',
} as const

export function ChatComposer({
  inputId,
  label,
  value,
  placeholder,
  submitLabel,
  isLoading = false,
  maximumLength,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    submitMessage()
  }

  function submitMessage(): void {
    if (isLoading || !value.trim()) {
      return
    }

    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (
      event.key !== CHAT_COMPOSER_KEY.ENTER ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }

    event.preventDefault()
    submitMessage()
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={inputId}>{label}</label>
      <textarea
        id={inputId}
        value={value}
        placeholder={placeholder}
        maxLength={maximumLength}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" disabled={isLoading || !value.trim()}>
        {submitLabel}
      </button>
    </form>
  )
}
