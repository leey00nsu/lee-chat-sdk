import { resolveLeeChatConfig, type LeeChatConfig } from '../config/lee-chat-config'
import { createChatMessageId } from '../lib/create-chat-message-id'
import type { ChatMessage } from '../model/chat-message'
import {
  buildLeeChatRequest,
  parseLeeChatResponse,
  type LeeChatResponse,
} from '../request/lee-chat-request'
import '../react/lee-chat-widget.css'

export interface InitLeeChatConfig extends LeeChatConfig {
  container?: HTMLElement
  fetchImplementation?: typeof fetch
}

export interface LeeChatInstance {
  open(): void
  close(): void
  destroy(): void
}

const LEE_CHAT_CONTAINER_ATTRIBUTE = 'data-lee-chat-container'
const LEE_CHAT_STORAGE_VERSION = '1'
const LEE_CHAT_FORM_CLASS_NAME = 'lee-chat-vanilla-form'
const LEE_CHAT_TEXTAREA_CLASS_NAME = 'lee-chat-vanilla-textarea'
const LEE_CHAT_SUBMIT_CLASS_NAME = 'lee-chat-vanilla-submit'
const LEE_CHAT_SCROLL_ANCHOR_CLASS_NAME = 'lee-chat-scroll-anchor'
const LEE_CHAT_CLOSE_LABEL = 'Close chat'
const LEE_CHAT_INPUT_LABEL = 'Message'
const LEE_CHAT_CONTENT_TYPE_HEADER = 'Content-Type'
const LEE_CHAT_JSON_CONTENT_TYPE = 'application/json'
const LEE_CHAT_POST_METHOD = 'POST'
const LEE_CHAT_CONVERSATION_SUFFIX = 'conversation'
const LEE_CHAT_KEY = {
  ENTER: 'Enter',
} as const

let activeContainer: HTMLElement | null = null
let activeConfig: InitLeeChatConfig | null = null
let activeIsOpen = false
let activeMessages: ChatMessage<Record<string, unknown>>[] = []

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function resolvePositionClassName(position: string): string {
  return position === 'bottom-left'
    ? 'lee-chat-root--bottom-left'
    : 'lee-chat-root--bottom-right'
}

function resolveConversationId(config: LeeChatConfig): string {
  return `${config.appId}-${LEE_CHAT_CONVERSATION_SUFFIX}`
}

function resolveStorageKey(config: LeeChatConfig): string {
  return `lee-chat:${config.appId}:${LEE_CHAT_CONVERSATION_SUFFIX}:v${LEE_CHAT_STORAGE_VERSION}`
}

function createDefaultContainer(): HTMLElement {
  const container = document.createElement('div')
  container.setAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE, 'true')
  document.body.append(container)

  return container
}

function createElementWithClassName(
  tagName: keyof HTMLElementTagNameMap,
  className?: string,
): HTMLElement {
  const element = document.createElement(tagName)

  if (className) {
    element.className = className
  }

  return element
}

function loadMessages(config: LeeChatConfig): ChatMessage<Record<string, unknown>>[] {
  if (config.persistence !== 'localStorage') {
    return []
  }

  const serializedMessages = window.localStorage.getItem(resolveStorageKey(config))

  if (!serializedMessages) {
    return []
  }

  try {
    const parsedMessages = JSON.parse(serializedMessages)

    return Array.isArray(parsedMessages)
      ? (parsedMessages as ChatMessage<Record<string, unknown>>[])
      : []
  } catch {
    return []
  }
}

function persistMessages(config: LeeChatConfig): void {
  if (config.persistence !== 'localStorage') {
    return
  }

  window.localStorage.setItem(
    resolveStorageKey(config),
    JSON.stringify(activeMessages),
  )
}

function applyTheme(config: LeeChatConfig): void {
  const resolvedConfig = resolveLeeChatConfig(config)
  const rootStyle = document.documentElement.style

  rootStyle.setProperty('--lee-chat-primary', resolvedConfig.theme.primaryColor)
  rootStyle.setProperty('--lee-chat-radius', resolvedConfig.theme.radius)
}

function renderMessage(message: ChatMessage<Record<string, unknown>>): HTMLElement {
  const article = createElementWithClassName(
    'article',
    mergeClassNames('lee-chat-message', `lee-chat-message--${message.role}`),
  )
  const paragraph = document.createElement('p')
  paragraph.textContent = message.content
  article.append(paragraph)

  return article
}

function renderMessageList(config: LeeChatConfig): HTMLElement {
  const resolvedConfig = resolveLeeChatConfig(config)
  const wrapper = createElementWithClassName(
    'div',
    mergeClassNames(
      'lee-chat-message-list',
      resolvedConfig.className?.messageList,
    ),
  )
  const list = document.createElement('ol')

  activeMessages.forEach((message) => {
    const item = document.createElement('li')
    item.append(renderMessage(message))
    list.append(item)
  })

  const scrollAnchor = createElementWithClassName(
    'div',
    LEE_CHAT_SCROLL_ANCHOR_CLASS_NAME,
  )
  scrollAnchor.setAttribute('aria-hidden', 'true')

  wrapper.append(list, scrollAnchor)

  return wrapper
}

function renderComposer(config: LeeChatConfig): HTMLElement {
  const resolvedConfig = resolveLeeChatConfig(config)
  const wrapper = createElementWithClassName(
    'div',
    mergeClassNames('lee-chat-composer', resolvedConfig.className?.composer),
  )
  const form = createElementWithClassName('form', LEE_CHAT_FORM_CLASS_NAME)
  const label = document.createElement('label')
  const textarea = document.createElement('textarea')
  const button = document.createElement('button')
  const inputId = `${resolvedConfig.appId}-lee-chat-message`

  label.htmlFor = inputId
  label.textContent = LEE_CHAT_INPUT_LABEL
  textarea.id = inputId
  textarea.className = LEE_CHAT_TEXTAREA_CLASS_NAME
  textarea.placeholder = resolvedConfig.texts.placeholder
  button.type = 'submit'
  button.className = LEE_CHAT_SUBMIT_CLASS_NAME
  button.textContent = resolvedConfig.texts.send

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    submitTextareaMessage(config, textarea)
  })
  textarea.addEventListener('keydown', (event) => {
    if (
      event.key !== LEE_CHAT_KEY.ENTER ||
      event.shiftKey ||
      event.isComposing
    ) {
      return
    }

    event.preventDefault()
    submitTextareaMessage(config, textarea)
  })

  form.append(label, textarea, button)
  wrapper.append(form)

  return wrapper
}

function submitTextareaMessage(
  config: LeeChatConfig,
  textarea: HTMLTextAreaElement,
): void {
  const content = textarea.value.trim()

  if (!content) {
    return
  }

  textarea.value = ''
  void submitMessage(config, content)
}

function renderPanel(config: LeeChatConfig): HTMLElement {
  const resolvedConfig = resolveLeeChatConfig(config)
  const panel = createElementWithClassName(
    'section',
    mergeClassNames('lee-chat-panel', resolvedConfig.className?.panel),
  )
  const header = createElementWithClassName(
    'header',
    mergeClassNames('lee-chat-header', resolvedConfig.className?.header),
  )
  const headingWrapper = document.createElement('div')
  const title = document.createElement('h2')
  const subtitle = document.createElement('p')
  const closeButton = createElementWithClassName('button', 'lee-chat-close')

  panel.setAttribute('aria-label', resolvedConfig.texts.title)
  title.textContent = resolvedConfig.texts.title
  subtitle.textContent = resolvedConfig.texts.subtitle
  closeButton.setAttribute('type', 'button')
  closeButton.setAttribute('aria-label', LEE_CHAT_CLOSE_LABEL)
  closeButton.textContent = '×'
  closeButton.addEventListener('click', closeLeeChat)

  headingWrapper.append(title, subtitle)
  header.append(headingWrapper, closeButton)
  panel.append(header, renderMessageList(config), renderComposer(config))

  return panel
}

function renderTrigger(config: LeeChatConfig): HTMLElement {
  const resolvedConfig = resolveLeeChatConfig(config)
  const trigger = createElementWithClassName(
    'button',
    mergeClassNames('lee-chat-trigger', resolvedConfig.className?.trigger),
  )
  const label = document.createElement('span')

  trigger.setAttribute('type', 'button')
  trigger.setAttribute('aria-label', resolvedConfig.texts.triggerLabel)
  trigger.setAttribute('aria-expanded', String(activeIsOpen))
  label.textContent = resolvedConfig.texts.triggerLabel
  trigger.append(label)
  trigger.addEventListener('click', () => {
    activeIsOpen = !activeIsOpen
    renderActiveWidget()
  })

  return trigger
}

function renderActiveWidget(): void {
  if (!activeContainer || !activeConfig) {
    return
  }

  const resolvedConfig = resolveLeeChatConfig(activeConfig)
  activeContainer.replaceChildren()
  applyTheme(activeConfig)

  const root = createElementWithClassName(
    'div',
    mergeClassNames(
      'lee-chat-root',
      resolvePositionClassName(resolvedConfig.position),
      resolvedConfig.className?.root,
    ),
  )
  root.setAttribute('data-testid', 'lee-chat-root')

  if (activeIsOpen) {
    root.append(renderPanel(activeConfig))
  }

  root.append(renderTrigger(activeConfig))
  activeContainer.append(root)
  scrollLatestMessageIntoView(root)
}

function scrollLatestMessageIntoView(root: HTMLElement): void {
  if (!activeIsOpen) {
    return
  }

  const scrollAnchor = root.querySelector(`.${LEE_CHAT_SCROLL_ANCHOR_CLASS_NAME}`)

  if (typeof scrollAnchor?.scrollIntoView !== 'function') {
    return
  }

  scrollAnchor.scrollIntoView({ block: 'end' })
}

async function submitMessage(
  config: LeeChatConfig,
  content: string,
): Promise<void> {
  const fetchImplementation = activeConfig?.fetchImplementation ?? fetch
  const createdAt = new Date().toISOString()
  const userMessage: ChatMessage<Record<string, unknown>> = {
    id: createChatMessageId(),
    conversationId: resolveConversationId(config),
    role: 'user',
    content,
    status: 'sent',
    createdAt,
  }
  const previousMessages = activeMessages

  activeMessages = [...activeMessages, userMessage]
  persistMessages(config)
  renderActiveWidget()

  const response = await fetchImplementation(config.endpoint, {
    method: LEE_CHAT_POST_METHOD,
    headers: {
      [LEE_CHAT_CONTENT_TYPE_HEADER]: LEE_CHAT_JSON_CONTENT_TYPE,
    },
    body: JSON.stringify(
      buildLeeChatRequest({
        appId: config.appId,
        message: userMessage,
        history: previousMessages,
        user: config.user,
        metadata: config.metadata,
      }),
    ),
  })
  const responseBody = (await response.json()) as LeeChatResponse
  const parsedResponse = parseLeeChatResponse(responseBody)
  const assistantMessage: ChatMessage<Record<string, unknown>> = {
    id: parsedResponse.message.id,
    conversationId: userMessage.conversationId,
    role: 'assistant',
    content: parsedResponse.message.content,
    status: 'sent',
    createdAt: parsedResponse.message.createdAt,
    metadata: parsedResponse.message.metadata,
  }

  activeMessages = [...activeMessages, assistantMessage]
  persistMessages(config)
  renderActiveWidget()
}

export function initLeeChat(config: InitLeeChatConfig): LeeChatInstance {
  destroyLeeChat()

  activeConfig = config
  activeContainer = config.container ?? createDefaultContainer()
  activeContainer.setAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE, 'true')
  activeIsOpen = Boolean(config.initialOpen)
  activeMessages = loadMessages(config)

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
  if (activeContainer?.getAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE) === 'true') {
    activeContainer.remove()
  }

  activeContainer = null
  activeConfig = null
  activeIsOpen = false
  activeMessages = []
}
