import type { ReactNode } from 'react'

export interface ChatWidgetShellProps {
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
}

export function ChatWidgetShell({
  title,
  description,
  children,
  footer,
}: ChatWidgetShellProps) {
  return (
    <section aria-label={title}>
      <header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div>{children}</div>
      {footer ? <footer>{footer}</footer> : null}
    </section>
  )
}
