import { resolveLeeChatConfig, type LeeChatConfig } from '../config/lee-chat-config'
import { createChatMessageId } from '../lib/create-chat-message-id'
import {
  createTextMessageParts,
  type ChatMessage,
  type ChatMessagePart,
} from '../model/chat-message'
import type {
  ChatParticipantPresence,
  ChatReadReceipt,
  ChatTypingIndicator,
} from '../model/chat-participant-state'
import {
  buildLeeChatRequest,
  parseLeeChatResponse,
  type LeeChatResponse,
} from '../request/lee-chat-request'
import type {
  ChatEventTransport,
  ChatEventUnsubscribe,
} from '../transport/chat-event-transport'
import '../style/lee-chat-widget.css'

export interface LeeChatVanillaHeaderRenderParams {
  title: string
  subtitle: string
  isOpen: boolean
  hasOnlineParticipant: boolean
  close: () => void
}

export interface LeeChatVanillaTriggerRenderParams {
  label: string
  isOpen: boolean
  unreadCount: number
  open: () => void
  close: () => void
  toggle: () => void
}

export interface LeeChatVanillaMessageRenderParams {
  message: ChatMessage<Record<string, unknown>>
  retryMessage: (messageId: string) => void
}

export interface LeeChatVanillaComposerFooterRenderParams {
  isSubmitting: boolean
}

export interface InitLeeChatConfig extends LeeChatConfig {
  container?: HTMLElement
  fetchImplementation?: typeof fetch
  eventTransport?: ChatEventTransport
  renderHeader?: (params: LeeChatVanillaHeaderRenderParams) => HTMLElement
  renderTrigger?: (params: LeeChatVanillaTriggerRenderParams) => HTMLElement
  renderMessage?: (params: LeeChatVanillaMessageRenderParams) => HTMLElement
  renderComposerFooter?: (
    params: LeeChatVanillaComposerFooterRenderParams,
  ) => HTMLElement
}

export interface LeeChatInstance {
  open(): void
  close(): void
  applyEvent(event: LeeChatVanillaEvent): void
  destroy(): void
}

export interface LeeChatVanillaParticipantState {
  presences: ChatParticipantPresence[]
  typingIndicators: ChatTypingIndicator[]
  readReceipts: ChatReadReceipt[]
}

export type LeeChatVanillaEvent =
  | {
      type: 'participant.presence_changed'
      presence: ChatParticipantPresence
    }
  | {
      type: 'participant.typing_changed'
      typingIndicator: ChatTypingIndicator
    }
  | {
      type: 'message.read'
      readReceipt: ChatReadReceipt
    }

const LEE_CHAT_CONTAINER_ATTRIBUTE = 'data-lee-chat-container'
const LEE_CHAT_STORAGE_VERSION = '1'
const LEE_CHAT_FORM_CLASS_NAME = 'lee-chat-vanilla-form'
const LEE_CHAT_TEXTAREA_CLASS_NAME = 'lee-chat-vanilla-textarea'
const LEE_CHAT_SUBMIT_CLASS_NAME = 'lee-chat-vanilla-submit'
const LEE_CHAT_SCROLL_ANCHOR_CLASS_NAME = 'lee-chat-scroll-anchor'
const LEE_CHAT_MESSAGE_STATUS_CLASS_NAME = 'lee-chat-message-status'
const LEE_CHAT_RETRY_CLASS_NAME = 'lee-chat-retry'
const LEE_CHAT_READ_RECEIPT_CLASS_NAME = 'lee-chat-read-receipt'
const LEE_CHAT_ASSISTANT_LOADING_CLASS_NAME = 'lee-chat-assistant-loading'
const LEE_CHAT_PARTICIPANT_STATUS_CLASS_NAME = 'lee-chat-participant-status'
const LEE_CHAT_TYPING_INDICATOR_CLASS_NAME = 'lee-chat-typing-indicator'
const LEE_CHAT_CLOSE_LABEL = 'Close chat'
const LEE_CHAT_INPUT_LABEL = 'Message'
const LEE_CHAT_CONTENT_TYPE_HEADER = 'Content-Type'
const LEE_CHAT_JSON_CONTENT_TYPE = 'application/json'
const LEE_CHAT_POST_METHOD = 'POST'
const LEE_CHAT_CONVERSATION_SUFFIX = 'conversation'
const LEE_CHAT_REQUEST_TIMEOUT = {
  DISABLED_MS: 0,
} as const
const LEE_CHAT_KEY = {
  ENTER: 'Enter',
} as const

let activeContainer: HTMLElement | null = null
let activeConfig: InitLeeChatConfig | null = null
let activeIsOpen = false
let activeIsSubmitting = false
let activeMessages: ChatMessage<Record<string, unknown>>[] = []
let activeEventUnsubscribe: ChatEventUnsubscribe | null = null
let activeParticipantState: LeeChatVanillaParticipantState = {
  presences: [],
  typingIndicators: [],
  readReceipts: [],
}

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function resolvePositionClassName(position: string): string {
  return position === 'bottom-left'
    ? 'lee-chat-root--bottom-left'
    : 'lee-chat-root--bottom-right'
}

function resolveConversationId(config: LeeChatConfig): string {
  return resolveLeeChatConfig(config).conversation.id
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

function hasOnlineParticipant(config: LeeChatConfig): boolean {
  const resolvedConfig = resolveLeeChatConfig(config)

  return activeParticipantState.presences.some((presence) => {
    return (
      presence.participantId !== resolvedConfig.participant.id &&
      presence.status === 'online'
    )
  })
}

function hasTypingParticipant(config: LeeChatConfig): boolean {
  const resolvedConfig = resolveLeeChatConfig(config)

  return activeParticipantState.typingIndicators.some((typingIndicator) => {
    return (
      typingIndicator.conversationId === resolvedConfig.conversation.id &&
      typingIndicator.participantId !== resolvedConfig.participant.id &&
      typingIndicator.isTyping
    )
  })
}

function isMessageReadByAnotherParticipant(
  config: LeeChatConfig,
  message: ChatMessage<Record<string, unknown>>,
): boolean {
  const resolvedConfig = resolveLeeChatConfig(config)

  if (message.senderId !== resolvedConfig.participant.id) {
    return false
  }

  return activeParticipantState.readReceipts.some((readReceipt) => {
    return (
      readReceipt.conversationId === message.conversationId &&
      readReceipt.messageId === message.id &&
      readReceipt.participantId !== resolvedConfig.participant.id
    )
  })
}

function renderMessage(
  config: LeeChatConfig,
  message: ChatMessage<Record<string, unknown>>,
): HTMLElement {
  if (activeConfig?.renderMessage) {
    return activeConfig.renderMessage({
      message,
      retryMessage: (messageId) => {
        void retryMessage(messageId)
      },
    })
  }

  const article = createElementWithClassName(
    'article',
    mergeClassNames(
      'lee-chat-message',
      `lee-chat-message--${message.role}`,
      `lee-chat-message--${message.status}`,
      activeConfig?.className?.message,
    ),
  )
  message.parts.forEach((part) => {
    article.append(renderMessagePart(part))
  })

  if (message.status === 'sending') {
    const status = createElementWithClassName(
      'small',
      mergeClassNames(
        LEE_CHAT_MESSAGE_STATUS_CLASS_NAME,
        activeConfig?.className?.messageStatus,
      ),
    )
    status.textContent = activeConfig?.texts?.messageSending ?? 'Sending...'
    article.append(status)
  }

  if (message.status === 'failed') {
    const status = createElementWithClassName(
      'div',
      mergeClassNames(
        LEE_CHAT_MESSAGE_STATUS_CLASS_NAME,
        activeConfig?.className?.messageStatus,
      ),
    )
    const error = document.createElement('small')
    const retryButton = createElementWithClassName(
      'button',
      mergeClassNames(
        LEE_CHAT_RETRY_CLASS_NAME,
        activeConfig?.className?.retryButton,
      ),
    )

    error.textContent = activeConfig?.texts?.error ?? 'Message failed. Please try again.'
    retryButton.setAttribute('type', 'button')
    retryButton.textContent = activeConfig?.texts?.retry ?? 'Retry'
    retryButton.addEventListener('click', () => {
      void retryMessage(message.id)
    })
    status.append(error, retryButton)
    article.append(status)
  }

  if (isMessageReadByAnotherParticipant(config, message)) {
    const readReceipt = createElementWithClassName(
      'small',
      mergeClassNames(
        LEE_CHAT_READ_RECEIPT_CLASS_NAME,
        activeConfig?.className?.readReceipt,
      ),
    )

    readReceipt.textContent = activeConfig?.texts?.messageRead ?? 'Read'
    article.append(readReceipt)
  }

  return article
}

function renderMessagePart(part: ChatMessagePart): HTMLElement {
  if (part.type === 'image') {
    const image = createElementWithClassName('img', 'lee-chat-message-image')
    image.setAttribute('src', part.url)
    image.setAttribute('alt', part.alt ?? '')

    if (part.width) {
      image.setAttribute('width', String(part.width))
    }

    if (part.height) {
      image.setAttribute('height', String(part.height))
    }

    return image
  }

  if (part.type === 'file') {
    const link = createElementWithClassName('a', 'lee-chat-message-file')
    link.setAttribute('href', part.url)
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noreferrer')
    link.textContent = part.name
    return link
  }

  const paragraph = document.createElement('p')
  paragraph.textContent = part.text
  return paragraph
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
  let typingIndicator: HTMLElement | null = null

  activeMessages.forEach((message) => {
    const item = document.createElement('li')
    item.append(renderMessage(config, message))
    list.append(item)
  })

  if (activeIsSubmitting) {
    const loadingItem = document.createElement('li')
    const loadingMessage = createElementWithClassName(
      'article',
      mergeClassNames(
        'lee-chat-message',
        'lee-chat-message--assistant',
        'lee-chat-message--loading',
        LEE_CHAT_ASSISTANT_LOADING_CLASS_NAME,
        resolvedConfig.className?.assistantLoading,
      ),
    )
    const loadingText = document.createElement('p')

    loadingMessage.setAttribute('role', 'status')
    loadingText.textContent = resolvedConfig.texts.assistantLoading
    loadingMessage.append(loadingText)
    loadingItem.append(loadingMessage)
    list.append(loadingItem)
  }

  if (hasTypingParticipant(config)) {
    typingIndicator = createElementWithClassName(
      'p',
      mergeClassNames(
        LEE_CHAT_TYPING_INDICATOR_CLASS_NAME,
        resolvedConfig.className?.typingIndicator,
      ),
    )

    typingIndicator.setAttribute('role', 'status')
    typingIndicator.textContent = resolvedConfig.texts.participantTyping
  }

  const scrollAnchor = createElementWithClassName(
    'div',
    LEE_CHAT_SCROLL_ANCHOR_CLASS_NAME,
  )
  scrollAnchor.setAttribute('aria-hidden', 'true')

  wrapper.append(list)

  if (typingIndicator) {
    wrapper.append(typingIndicator)
  }

  wrapper.append(scrollAnchor)

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
  button.textContent = activeIsSubmitting
    ? resolvedConfig.texts.sending
    : resolvedConfig.texts.send
  button.disabled = activeIsSubmitting

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

  if (activeConfig?.renderComposerFooter) {
    wrapper.append(
      activeConfig.renderComposerFooter({
        isSubmitting: activeIsSubmitting,
      }),
    )
  }

  return wrapper
}

function submitTextareaMessage(
  config: LeeChatConfig,
  textarea: HTMLTextAreaElement,
): void {
  if (activeIsSubmitting) {
    return
  }

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

  panel.setAttribute('aria-label', resolvedConfig.texts.title)

  if (activeConfig?.renderHeader) {
    header.append(
      activeConfig.renderHeader({
        title: resolvedConfig.texts.title,
        subtitle: resolvedConfig.texts.subtitle,
        isOpen: activeIsOpen,
        hasOnlineParticipant: hasOnlineParticipant(config),
        close: closeLeeChat,
      }),
    )
    panel.append(header, renderMessageList(config), renderComposer(config))

    return panel
  }

  appendDefaultHeaderContent(header, config)

  panel.append(header, renderMessageList(config), renderComposer(config))

  return panel
}

function appendDefaultHeaderContent(
  header: HTMLElement,
  config: LeeChatConfig,
): void {
  const resolvedConfig = resolveLeeChatConfig(config)
  const headingWrapper = document.createElement('div')
  const title = document.createElement('h2')
  const subtitle = document.createElement('p')
  const closeButton = createElementWithClassName('button', 'lee-chat-close')

  title.textContent = resolvedConfig.texts.title
  subtitle.textContent = resolvedConfig.texts.subtitle
  closeButton.setAttribute('type', 'button')
  closeButton.setAttribute('aria-label', LEE_CHAT_CLOSE_LABEL)
  closeButton.textContent = '×'
  closeButton.addEventListener('click', closeLeeChat)
  headingWrapper.append(title, subtitle)

  if (hasOnlineParticipant(config)) {
    const participantStatus = createElementWithClassName(
      'small',
      mergeClassNames(
        LEE_CHAT_PARTICIPANT_STATUS_CLASS_NAME,
        resolvedConfig.className?.participantStatus,
      ),
    )

    participantStatus.textContent = resolvedConfig.texts.participantOnline
    headingWrapper.append(participantStatus)
  }

  header.append(headingWrapper, closeButton)
}

function renderTrigger(config: LeeChatConfig): HTMLElement {
  const resolvedConfig = resolveLeeChatConfig(config)

  if (activeConfig?.renderTrigger) {
    return activeConfig.renderTrigger({
      label: resolvedConfig.texts.triggerLabel,
      isOpen: activeIsOpen,
      unreadCount: resolveUnreadCount(config),
      open: openLeeChat,
      close: closeLeeChat,
      toggle: toggleLeeChat,
    })
  }

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
  trigger.addEventListener('click', toggleLeeChat)

  return trigger
}

function resolveUnreadCount(config: LeeChatConfig): number {
  if (activeIsOpen) {
    return 0
  }

  const resolvedConfig = resolveLeeChatConfig(config)

  return activeMessages.filter((message) => {
    return (
      message.senderId !== resolvedConfig.participant.id &&
      message.status === 'sent'
    )
  }).length
}

function toggleLeeChat(): void {
  activeIsOpen = !activeIsOpen
  renderActiveWidget()
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
  const resolvedConfig = resolveLeeChatConfig(config)
  const userMessage: ChatMessage<Record<string, unknown>> = {
    id: createChatMessageId(),
    conversationId: resolveConversationId(config),
    senderId: resolvedConfig.participant.id,
    role: 'user',
    content,
    parts: createTextMessageParts(content),
    status: 'sending',
    createdAt,
  }
  const previousMessages = activeMessages

  activeMessages = [...activeMessages, userMessage]
  activeIsSubmitting = true
  persistMessages(config)
  renderActiveWidget()

  await sendMessageToEndpoint({
    config,
    userMessage,
    previousMessages,
  })
}

async function retryMessage(messageId: string): Promise<void> {
  if (!activeConfig || activeIsSubmitting) {
    return
  }

  const failedMessage = activeMessages.find((message) => {
    return message.id === messageId && message.status === 'failed'
  })

  if (!failedMessage) {
    return
  }

  const retryingMessage: ChatMessage<Record<string, unknown>> = {
    ...failedMessage,
    status: 'sending',
  }

  activeMessages = replaceMessage(activeMessages, retryingMessage)
  activeIsSubmitting = true
  persistMessages(activeConfig)
  renderActiveWidget()

  await sendMessageToEndpoint({
    config: activeConfig,
    userMessage: retryingMessage,
    previousMessages: activeMessages.filter((message) => message.id !== messageId),
  })
}

async function sendMessageToEndpoint({
  config,
  userMessage,
  previousMessages,
}: {
  config: LeeChatConfig
  userMessage: ChatMessage<Record<string, unknown>>
  previousMessages: ChatMessage<Record<string, unknown>>[]
}): Promise<void> {
  const fetchImplementation = activeConfig?.fetchImplementation ?? fetch
  const resolvedConfig = resolveLeeChatConfig(config)
  const abortController = new AbortController()
  const timeoutId = createRequestTimeout({
    config,
    abortController,
  })

  try {
    const response = await fetchImplementation(config.endpoint, {
      method: LEE_CHAT_POST_METHOD,
      headers: {
        [LEE_CHAT_CONTENT_TYPE_HEADER]: LEE_CHAT_JSON_CONTENT_TYPE,
      },
      body: JSON.stringify(
        buildLeeChatRequest({
          appId: config.appId,
          conversation: resolvedConfig.conversation,
          participant: resolvedConfig.participant,
          message: userMessage,
          history: previousMessages,
          metadata: config.metadata,
        }),
      ),
      signal: abortController.signal,
    })
    const responseBody = (await response.json()) as LeeChatResponse
    const parsedResponse = parseLeeChatResponse(responseBody)
    const sentUserMessage: ChatMessage<Record<string, unknown>> = {
      ...userMessage,
      status: 'sent',
    }
    const assistantMessage: ChatMessage<Record<string, unknown>> = {
      id: parsedResponse.message.id,
      conversationId: userMessage.conversationId,
      senderId: `${resolvedConfig.appId}-assistant`,
      role: 'assistant',
      content: parsedResponse.message.content,
      parts: parsedResponse.message.parts,
      status: 'sent',
      createdAt: parsedResponse.message.createdAt,
      metadata: parsedResponse.message.metadata,
    }

    activeMessages = [
      ...replaceMessage(activeMessages, sentUserMessage),
      assistantMessage,
    ]
  } catch {
    activeMessages = replaceMessage(activeMessages, {
      ...userMessage,
      status: 'failed',
    })
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    activeIsSubmitting = false
    persistMessages(config)
    renderActiveWidget()
  }
}

function createRequestTimeout({
  config,
  abortController,
}: {
  config: LeeChatConfig
  abortController: AbortController
}): ReturnType<typeof setTimeout> | undefined {
  if (
    !config.requestTimeoutMs ||
    config.requestTimeoutMs <= LEE_CHAT_REQUEST_TIMEOUT.DISABLED_MS
  ) {
    return undefined
  }

  return setTimeout(() => {
    abortController.abort()
  }, config.requestTimeoutMs)
}

function applyLeeChatEvent(event: LeeChatVanillaEvent): void {
  if (event.type === 'participant.presence_changed') {
    activeParticipantState = {
      ...activeParticipantState,
      presences: replaceParticipantPresence(
        activeParticipantState.presences,
        event.presence,
      ),
    }
    renderActiveWidget()
    return
  }

  if (event.type === 'participant.typing_changed') {
    activeParticipantState = {
      ...activeParticipantState,
      typingIndicators: replaceTypingIndicator(
        activeParticipantState.typingIndicators,
        event.typingIndicator,
      ),
    }
    renderActiveWidget()
    return
  }

  activeParticipantState = {
    ...activeParticipantState,
    readReceipts: replaceReadReceipt(
      activeParticipantState.readReceipts,
      event.readReceipt,
    ),
  }
  renderActiveWidget()
}

export function initLeeChat(config: InitLeeChatConfig): LeeChatInstance {
  destroyLeeChat()

  activeConfig = {
    ...config,
    ...resolveLeeChatConfig(config),
  }
  activeContainer = config.container ?? createDefaultContainer()
  activeContainer.setAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE, 'true')
  activeIsOpen = Boolean(config.initialOpen)
  activeMessages = loadMessages(config)
  activeEventUnsubscribe = config.eventTransport?.subscribe(applyLeeChatEvent) ?? null

  renderActiveWidget()

  return {
    open: openLeeChat,
    close: closeLeeChat,
    applyEvent: applyLeeChatEvent,
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
  activeEventUnsubscribe?.()
  activeEventUnsubscribe = null

  if (activeContainer?.getAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE) === 'true') {
    activeContainer.remove()
  }

  activeContainer = null
  activeConfig = null
  activeIsOpen = false
  activeIsSubmitting = false
  activeMessages = []
  activeParticipantState = {
    presences: [],
    typingIndicators: [],
    readReceipts: [],
  }
}

function replaceMessage(
  messages: ChatMessage<Record<string, unknown>>[],
  nextMessage: ChatMessage<Record<string, unknown>>,
): ChatMessage<Record<string, unknown>>[] {
  return messages.map((message) => {
    if (message.id !== nextMessage.id) {
      return message
    }

    return nextMessage
  })
}

function replaceParticipantPresence(
  presences: ChatParticipantPresence[],
  nextPresence: ChatParticipantPresence,
): ChatParticipantPresence[] {
  const otherPresences = presences.filter((presence) => {
    return presence.participantId !== nextPresence.participantId
  })

  return [...otherPresences, nextPresence]
}

function replaceTypingIndicator(
  indicators: ChatTypingIndicator[],
  nextIndicator: ChatTypingIndicator,
): ChatTypingIndicator[] {
  const otherIndicators = indicators.filter((indicator) => {
    return !(
      indicator.conversationId === nextIndicator.conversationId &&
      indicator.participantId === nextIndicator.participantId
    )
  })

  return [...otherIndicators, nextIndicator]
}

function replaceReadReceipt(
  readReceipts: ChatReadReceipt[],
  nextReadReceipt: ChatReadReceipt,
): ChatReadReceipt[] {
  const otherReadReceipts = readReceipts.filter((readReceipt) => {
    return !(
      readReceipt.conversationId === nextReadReceipt.conversationId &&
      readReceipt.messageId === nextReadReceipt.messageId &&
      readReceipt.participantId === nextReadReceipt.participantId
    )
  })

  return [...otherReadReceipts, nextReadReceipt]
}
