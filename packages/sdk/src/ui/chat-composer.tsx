'use client'

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  createChatMessagePartFromAttachment,
  type UploadedChatAttachment,
} from '../model/chat-attachment'
import type { ChatMessagePart } from '../model/chat-message'

export interface ChatComposerSubmitContentRenderParams {
  isSubmitting: boolean
  isUploading: boolean
  defaultContent: ReactNode
}

export interface ChatComposerProps {
  inputId: string
  label: string
  value: string
  placeholder: string
  submitLabel: string
  isLoading?: boolean
  maximumLength?: number
  uploadAttachment?: (file: File) => Promise<UploadedChatAttachment>
  renderSubmitContent?: (
    params: ChatComposerSubmitContentRenderParams,
  ) => ReactNode
  onChange: (nextValue: string) => void
  onSubmit: (parts?: ChatMessagePart[]) => void
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
  uploadAttachment,
  renderSubmitContent,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const [pendingParts, setPendingParts] = useState<ChatMessagePart[]>([])
  const [isUploading, setIsUploading] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    submitMessage()
  }

  function submitMessage(): void {
    if (isLoading || isUploading || (!value.trim() && pendingParts.length === 0)) {
      return
    }

    onSubmit(resolveSubmittedParts())
    setPendingParts([])
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

  async function handleAttachmentChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const files = Array.from(event.target.files ?? [])

    if (!uploadAttachment || files.length === 0) {
      return
    }

    setIsUploading(true)

    try {
      const uploadedParts = await Promise.all(
        files.map(async (file) => {
          return createChatMessagePartFromAttachment(await uploadAttachment(file))
        }),
      )

      setPendingParts((currentParts) => [...currentParts, ...uploadedParts])
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  function resolveSubmittedParts(): ChatMessagePart[] | undefined {
    const trimmedValue = value.trim()

    if (pendingParts.length === 0) {
      return undefined
    }

    return [
      ...(trimmedValue
        ? [
            {
              type: 'text' as const,
              text: trimmedValue,
            },
          ]
        : []),
      ...pendingParts,
    ]
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
      {uploadAttachment ? (
        <>
          <label htmlFor={`${inputId}-attachment`}>Attach file</label>
          <input
            id={`${inputId}-attachment`}
            type="file"
            multiple
            disabled={isLoading || isUploading}
            onChange={(event) => {
              void handleAttachmentChange(event)
            }}
          />
          {pendingParts.length > 0 ? (
            <ul className="lee-chat-attachment-list">
              {pendingParts.map((part) => {
                return (
                  <li key={createPendingPartKey(part)}>
                    {createPendingPartLabel(part)}
                  </li>
                )
              })}
            </ul>
          ) : null}
        </>
      ) : null}
      <button
        type="submit"
        aria-label={submitLabel}
        disabled={isLoading || isUploading || (!value.trim() && pendingParts.length === 0)}
      >
        {renderSubmitContent
          ? renderSubmitContent({
              isSubmitting: isLoading,
              isUploading,
              defaultContent: submitLabel,
            })
          : submitLabel}
      </button>
    </form>
  )
}

function createPendingPartLabel(part: ChatMessagePart): string {
  if (part.type === 'file') {
    return part.name
  }

  if (part.type === 'image') {
    return part.alt ?? part.url
  }

  return part.text
}

function createPendingPartKey(part: ChatMessagePart): string {
  if (part.type === 'text') {
    return `${part.type}-${part.text}`
  }

  return `${part.type}-${part.url}`
}
