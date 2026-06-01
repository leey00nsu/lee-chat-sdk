'use client'

export interface FloatingChatTriggerProps {
  label: string
  isOpen: boolean
  onClick: () => void
}

export function FloatingChatTrigger({
  label,
  isOpen,
  onClick,
}: FloatingChatTriggerProps) {
  return (
    <button type="button" aria-label={label} aria-expanded={isOpen} onClick={onClick}>
      {label}
    </button>
  )
}
