import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { LeeChatConfig } from '../config/lee-chat-config'
import { LeeChatProvider } from '../react/lee-chat-provider'
import { LeeChatWidget } from '../react/lee-chat-widget'

export interface InitLeeChatConfig extends LeeChatConfig {
  container?: HTMLElement
  fetchImplementation?: typeof fetch
}

export interface LeeChatInstance {
  open(): void
  close(): void
  destroy(): void
}

interface LeeChatWidgetBridgeProps {
  config: LeeChatConfig
  isOpen: boolean
  fetchImplementation?: typeof fetch
}

const LEE_CHAT_CONTAINER_ATTRIBUTE = 'data-lee-chat-container'

let activeRoot: Root | null = null
let activeContainer: HTMLElement | null = null
let activeConfig: InitLeeChatConfig | null = null
let activeIsOpen = false

function renderActiveWidget(): void {
  if (!activeRoot || !activeConfig) {
    return
  }

  const config = activeConfig

  flushSync(() => {
    activeRoot?.render(
      <LeeChatWidgetBridge
        config={{
          ...config,
          initialOpen: activeIsOpen,
        }}
        fetchImplementation={config.fetchImplementation}
        isOpen={activeIsOpen}
      />,
    )
  })
}

function LeeChatWidgetBridge({
  config,
  isOpen,
  fetchImplementation,
}: LeeChatWidgetBridgeProps) {
  return (
    <LeeChatProvider
      key={isOpen ? 'open' : 'closed'}
      config={config}
      fetchImplementation={fetchImplementation}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}

function createDefaultContainer(): HTMLElement {
  const container = document.createElement('div')
  container.setAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE, 'true')
  document.body.append(container)

  return container
}

export function initLeeChat(config: InitLeeChatConfig): LeeChatInstance {
  destroyLeeChat()

  activeConfig = config
  activeContainer = config.container ?? createDefaultContainer()
  activeContainer.setAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE, 'true')
  activeRoot = createRoot(activeContainer)
  activeIsOpen = Boolean(config.initialOpen)

  renderActiveWidget()

  return {
    open: openLeeChat,
    close: closeLeeChat,
    destroy: destroyLeeChat,
  }
}

export function openLeeChat(): void {
  activeIsOpen = true
  renderActiveWidget()
}

export function closeLeeChat(): void {
  activeIsOpen = false
  renderActiveWidget()
}

export function destroyLeeChat(): void {
  activeRoot?.unmount()
  activeRoot = null

  if (activeContainer?.getAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE) === 'true') {
    activeContainer.remove()
  }

  activeContainer = null
  activeConfig = null
  activeIsOpen = false
}
