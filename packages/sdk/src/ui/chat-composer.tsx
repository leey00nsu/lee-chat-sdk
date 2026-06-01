'use client'

import type { FormEvent } from 'react'

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

    if (isLoading || !value.trim()) {
      return
    }

    onSubmit()
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
      />
      <button type="submit" disabled={isLoading || !value.trim()}>
        {submitLabel}
      </button>
    </form>
  )
}
