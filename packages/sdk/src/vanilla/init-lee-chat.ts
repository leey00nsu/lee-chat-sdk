import { resolveLeeChatConfig, type LeeChatConfig } from '../config/lee-chat-config'
import { createChatMessageId } from '../lib/create-chat-message-id'
import {
  createTextMessageParts,
  type ChatMessage,
  type ChatMessagePart,
} from '../model/chat-message'
import {
  createChatMessagePartFromAttachment,
  type UploadedChatAttachment,
} from '../model/chat-attachment'
import type {
  ChatParticipantPresence,
  ChatReadReceipt,
  ChatTypingIndicator,
} from '../model/chat-participant-state'
import {
  buildLeeChatRequest,
  parseLeeChatResponse,
  type LeeChatRequest,
  type LeeChatResponse,
} from '../request/lee-chat-request'
import type {
  MarkMessageReadParams,
  MarkMessageReadResponse,
} from '../client/conversation-sync-client'
import type {
  ChatEventTransport,
  ChatEventUnsubscribe,
} from '../transport/chat-event-transport'
import { HttpChatTransport } from '../transport/http-chat-transport'
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
  uploadAttachment?: (file: File) => Promise<UploadedChatAttachment>
  isolation?: 'none' | 'shadowDom'
  syncClient?: {
    markMessageRead(
      params: MarkMessageReadParams,
    ): Promise<MarkMessageReadResponse>
  }
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
      type: 'message.created'
      message: ChatMessage
    }
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
const LEE_CHAT_ATTACHMENT_LIST_CLASS_NAME = 'lee-chat-attachment-list'
const LEE_CHAT_SCROLL_ANCHOR_CLASS_NAME = 'lee-chat-scroll-anchor'
const LEE_CHAT_MESSAGE_STATUS_CLASS_NAME = 'lee-chat-message-status'
const LEE_CHAT_RETRY_CLASS_NAME = 'lee-chat-retry'
const LEE_CHAT_READ_RECEIPT_CLASS_NAME = 'lee-chat-read-receipt'
const LEE_CHAT_ASSISTANT_LOADING_CLASS_NAME = 'lee-chat-assistant-loading'
const LEE_CHAT_PARTICIPANT_STATUS_CLASS_NAME = 'lee-chat-participant-status'
const LEE_CHAT_TYPING_INDICATOR_CLASS_NAME = 'lee-chat-typing-indicator'
const LEE_CHAT_CLOSE_LABEL = 'Close chat'
const LEE_CHAT_INPUT_LABEL = 'Message'
const LEE_CHAT_CONVERSATION_SUFFIX = 'conversation'
const LEE_CHAT_KEY = {
  ENTER: 'Enter',
} as const
const LEE_CHAT_SHADOW_STYLE = `
.lee-chat-root {
  --lee-chat-primary: #111827;
  --lee-chat-background: #ffffff;
  --lee-chat-foreground: #111827;
  --lee-chat-muted: #f3f4f6;
  --lee-chat-border: #e5e7eb;
  --lee-chat-radius: 12px;
  --lee-chat-z-index: 60;
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: var(--lee-chat-z-index);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
  font-family: inherit;
}
.lee-chat-root--bottom-left {
  right: auto;
  left: 24px;
  align-items: flex-start;
}
.lee-chat-panel {
  width: min(384px, calc(100vw - 32px));
  overflow: hidden;
  color: var(--lee-chat-foreground);
  background: var(--lee-chat-background);
  border: 1px solid var(--lee-chat-border);
  border-radius: var(--lee-chat-radius);
  box-shadow: 0 18px 48px rgb(15 23 42 / 18%);
}
.lee-chat-header,
.lee-chat-composer {
  padding: 16px;
  border-color: var(--lee-chat-border);
}
.lee-chat-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--lee-chat-border);
}
.lee-chat-header h2,
.lee-chat-header p,
.lee-chat-message p {
  margin: 0;
}
.lee-chat-header p,
.lee-chat-message-status,
.lee-chat-typing-indicator,
.lee-chat-read-receipt {
  color: #6b7280;
  font-size: 12px;
}
.lee-chat-message-list {
  max-height: 384px;
  overflow-y: auto;
  padding: 16px;
}
.lee-chat-message-list ol {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.lee-chat-message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 85%;
  padding: 10px 12px;
  border-radius: var(--lee-chat-radius);
  font-size: 14px;
  line-height: 1.5;
}
.lee-chat-message--user {
  margin-left: auto;
  color: #ffffff;
  background: var(--lee-chat-primary);
}
.lee-chat-message--assistant,
.lee-chat-message--agent,
.lee-chat-message--system {
  background: var(--lee-chat-muted);
}
.lee-chat-trigger,
.lee-chat-composer button {
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  background: var(--lee-chat-primary);
  cursor: pointer;
}
.lee-chat-trigger {
  min-height: 44px;
  padding: 0 18px;
  box-shadow: 0 12px 28px rgb(15 23 42 / 18%);
}
.lee-chat-close {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 20px;
}
.lee-chat-vanilla-form {
  display: flex;
  gap: 8px;
}
.lee-chat-vanilla-textarea {
  min-height: 44px;
  flex: 1;
  resize: vertical;
}
.lee-chat-composer input[type='file'] {
  font: inherit;
  font-size: 13px;
}
.lee-chat-attachment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  color: #4b5563;
  font-size: 12px;
  list-style: none;
}
.lee-chat-composer button {
  padding: 0 14px;
}
.lee-chat-message-image {
  max-width: 100%;
  height: auto;
}
`

let activeContainer: HTMLElement | null = null
let activeRenderRoot: HTMLElement | ShadowRoot | null = null
let activeConfig: InitLeeChatConfig | null = null
let activeIsOpen = false
let activeIsSubmitting = false
let activeMessages: ChatMessage<Record<string, unknown>>[] = []
let activeEventUnsubscribe: ChatEventUnsubscribe | null = null
let activeSyncedReadMessageIds = new Set<string>()
let activePendingAttachmentParts: ChatMessagePart[] = []
let activeIsUploadingAttachment = false
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
  return config.conversation?.id ?? resolveLeeChatConfig(config).conversation.id
}

function resolveStorageKey(config: LeeChatConfig): string {
  return `lee-chat:${config.appId}:${resolveConversationId(config)}:${LEE_CHAT_CONVERSATION_SUFFIX}:v${LEE_CHAT_STORAGE_VERSION}`
}

function createDefaultContainer(): HTMLElement {
  const container = document.createElement('div')
  container.setAttribute(LEE_CHAT_CONTAINER_ATTRIBUTE, 'true')
  document.body.append(container)

  return container
}

function resolveRenderRoot(config: InitLeeChatConfig): HTMLElement | ShadowRoot {
  if (!activeContainer) {
    throw new Error('Lee Chat container is not initialized.')
  }

  if (config.isolation !== 'shadowDom') {
    return activeContainer
  }

  const shadowRoot =
    activeContainer.shadowRoot ?? activeContainer.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = LEE_CHAT_SHADOW_STYLE
  shadowRoot.replaceChildren(style)

  return shadowRoot
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

function createInitialMessages(
  config: LeeChatConfig,
): ChatMessage<Record<string, unknown>>[] {
  const resolvedConfig = resolveLeeChatConfig(config)

  if (!resolvedConfig.initialMessage) {
    return []
  }

  return [
    {
      id: `${resolvedConfig.conversation.id}:initial-message`,
      conversationId: resolvedConfig.conversation.id,
      senderId: `${resolvedConfig.appId}-assistant`,
      role: 'assistant',
      content: resolvedConfig.initialMessage,
      parts: createTextMessageParts(resolvedConfig.initialMessage),
      status: 'sent',
      createdAt: new Date().toISOString(),
    },
  ]
}

function loadMessages(config: LeeChatConfig): ChatMessage<Record<string, unknown>>[] {
  if (config.persistence !== 'localStorage') {
    return createInitialMessages(config)
  }

  const serializedMessages = window.localStorage.getItem(resolveStorageKey(config))

  if (!serializedMessages) {
    return createInitialMessages(config)
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

function applyTheme(config: LeeChatConfig, root: HTMLElement): void {
  const resolvedConfig = resolveLeeChatConfig(config)
  const rootStyle = root.style

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

function isUnreadMessage(
  config: LeeChatConfig,
  message: ChatMessage<Record<string, unknown>>,
): boolean {
  const resolvedConfig = resolveLeeChatConfig(config)

  if (message.senderId === resolvedConfig.participant.id || message.status !== 'sent') {
    return false
  }

  return !activeParticipantState.readReceipts.some((readReceipt) => {
    return (
      readReceipt.conversationId === message.conversationId &&
      readReceipt.messageId === message.id &&
      readReceipt.participantId === resolvedConfig.participant.id
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
  const hasPendingAttachments = activePendingAttachmentParts.length > 0

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
  textarea.addEventListener('input', () => {
    updateSubmitButtonState(button, textarea)
  })

  form.append(label, textarea)

  if (
    activeConfig?.features?.attachments !== false &&
    activeConfig?.uploadAttachment
  ) {
    const attachmentInputId = `${inputId}-attachment`
    const attachmentLabel = document.createElement('label')
    const attachmentInput = document.createElement('input')

    attachmentLabel.htmlFor = attachmentInputId
    attachmentLabel.textContent = 'Attach file'
    attachmentInput.id = attachmentInputId
    attachmentInput.type = 'file'
    attachmentInput.multiple = true
    attachmentInput.disabled = activeIsSubmitting || activeIsUploadingAttachment
    attachmentInput.addEventListener('change', (event) => {
      void handleAttachmentChange(event)
    })
    form.append(attachmentLabel, attachmentInput)

    if (hasPendingAttachments) {
      form.append(renderPendingAttachmentList())
    }
  }

  updateSubmitButtonState(button, textarea)
  form.append(button)
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

function updateSubmitButtonState(
  button: HTMLButtonElement,
  textarea: HTMLTextAreaElement,
): void {
  button.disabled =
    activeIsSubmitting ||
    activeIsUploadingAttachment ||
    (!textarea.value.trim() && activePendingAttachmentParts.length === 0)
}

async function handleAttachmentChange(event: Event): Promise<void> {
  const uploadAttachment =
    activeConfig?.features?.attachments === false
      ? undefined
      : activeConfig?.uploadAttachment

  if (!uploadAttachment) {
    return
  }

  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const files = Array.from(input.files ?? [])

  if (files.length === 0) {
    return
  }

  activeIsUploadingAttachment = true
  renderActiveWidget()

  try {
    const uploadedParts = await Promise.all(
      files.map(async (file) => {
        return createChatMessagePartFromAttachment(
          await uploadAttachment(file),
        )
      }),
    )
    activePendingAttachmentParts = [
      ...activePendingAttachmentParts,
      ...uploadedParts,
    ]
  } finally {
    activeIsUploadingAttachment = false
    input.value = ''
    renderActiveWidget()
  }
}

function renderPendingAttachmentList(): HTMLElement {
  const list = createElementWithClassName(
    'ul',
    LEE_CHAT_ATTACHMENT_LIST_CLASS_NAME,
  )

  activePendingAttachmentParts.forEach((part) => {
    const item = document.createElement('li')
    item.textContent = createPendingAttachmentPartLabel(part)
    list.append(item)
  })

  return list
}

function createPendingAttachmentPartLabel(part: ChatMessagePart): string {
  if (part.type === 'file') {
    return part.name
  }

  if (part.type === 'image') {
    return part.alt ?? part.url
  }

  return part.text
}

function submitTextareaMessage(
  config: LeeChatConfig,
  textarea: HTMLTextAreaElement,
): void {
  if (activeIsSubmitting) {
    return
  }

  const content = textarea.value.trim()

  if (!content && activePendingAttachmentParts.length === 0) {
    return
  }

  const parts = createSubmittedMessageParts(content)
  textarea.value = ''
  activePendingAttachmentParts = []
  void submitMessage(config, content, parts)
}

function createSubmittedMessageParts(content: string): ChatMessagePart[] | undefined {
  if (activePendingAttachmentParts.length === 0) {
    return undefined
  }

  return [
    ...(content
      ? [
          {
            type: 'text' as const,
            text: content,
          },
        ]
      : []),
    ...activePendingAttachmentParts,
  ]
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

  return activeMessages.filter((message) => {
    return isUnreadMessage(config, message)
  }).length
}

function toggleLeeChat(): void {
  activeIsOpen = !activeIsOpen
  renderActiveWidget()
}

function renderActiveWidget(): void {
  if (!activeRenderRoot || !activeConfig) {
    return
  }

  const resolvedConfig = resolveLeeChatConfig(activeConfig)
  if (activeRenderRoot instanceof ShadowRoot) {
    const style = activeRenderRoot.querySelector('style')
    activeRenderRoot.replaceChildren()

    if (style) {
      activeRenderRoot.append(style)
    }
  } else {
    activeRenderRoot.replaceChildren()
  }

  const root = createElementWithClassName(
    'div',
    mergeClassNames(
      'lee-chat-root',
      resolvePositionClassName(resolvedConfig.position),
      resolvedConfig.className?.root,
    ),
  )
  root.setAttribute('data-testid', 'lee-chat-root')
  applyTheme(activeConfig, root)

  if (activeIsOpen) {
    root.append(renderPanel(activeConfig))
  }

  root.append(renderTrigger(activeConfig))
  activeRenderRoot.append(root)
  scrollLatestMessageIntoView(root)
  syncLatestUnreadMessage()
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
  parts?: ChatMessagePart[],
): Promise<void> {
  const createdAt = new Date().toISOString()
  const resolvedConfig = resolveLeeChatConfig(config)
  const userMessage: ChatMessage<Record<string, unknown>> = {
    id: createChatMessageId(),
    conversationId: resolveConversationId(config),
    senderId: resolvedConfig.participant.id,
    role: 'user',
    content,
    parts: parts ?? createTextMessageParts(content),
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
  const resolvedConfig = resolveLeeChatConfig(config)
  const transport = new HttpChatTransport<LeeChatRequest, LeeChatResponse>({
    endpoint: config.endpoint,
    fetchImplementation: activeConfig?.fetchImplementation,
    headers: config.requestHeaders,
    auth: config.requestAuth,
    timeoutMs: config.requestTimeoutMs,
    retry: config.requestRetry,
  })

  try {
    const responseBody = await transport.sendMessage(
      buildLeeChatRequest({
        appId: config.appId,
        conversation: resolvedConfig.conversation,
        participant: resolvedConfig.participant,
        visitor: resolvedConfig.visitor,
        message: userMessage,
        history: previousMessages,
        metadata: config.metadata,
      }),
    )
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
    activeIsSubmitting = false
    persistMessages(config)
    renderActiveWidget()
  }
}

function syncLatestUnreadMessage(): void {
  if (!activeIsOpen || !activeConfig?.syncClient) {
    return
  }

  const resolvedConfig = resolveLeeChatConfig(activeConfig)
  const latestUnreadMessage = activeMessages
    .filter((message) => {
      return isUnreadMessage(activeConfig as LeeChatConfig, message)
    })
    .at(-1)

  if (!latestUnreadMessage) {
    return
  }

  if (activeSyncedReadMessageIds.has(latestUnreadMessage.id)) {
    return
  }

  activeSyncedReadMessageIds.add(latestUnreadMessage.id)

  void activeConfig.syncClient
    .markMessageRead({
      conversationId: latestUnreadMessage.conversationId,
      messageId: latestUnreadMessage.id,
      participantId: resolvedConfig.participant.id,
    })
    .then(({ readReceipt }) => {
      applyLeeChatEvent({
        type: 'message.read',
        readReceipt,
      })
    })
}

function applyLeeChatEvent(event: LeeChatVanillaEvent): void {
  if (event.type === 'message.created') {
    if (!activeConfig) {
      return
    }

    if (
      event.message.conversationId !==
      resolveLeeChatConfig(activeConfig).conversation.id
    ) {
      return
    }

    activeMessages = upsertMessage(
      activeMessages,
      event.message as ChatMessage<Record<string, unknown>>,
    )
    persistMessages(activeConfig)
    renderActiveWidget()
    return
  }

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
  activeRenderRoot = resolveRenderRoot(config)
  activeIsOpen = Boolean(config.initialOpen)
  activeMessages = loadMessages(config)
  activeEventUnsubscribe =
    activeConfig.features?.realtime === false
      ? null
      : config.eventTransport?.subscribe(applyLeeChatEvent) ?? null

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
  activeRenderRoot = null
  activeConfig = null
  activeIsOpen = false
  activeIsSubmitting = false
  activeMessages = []
  activePendingAttachmentParts = []
  activeIsUploadingAttachment = false
  activeSyncedReadMessageIds = new Set()
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

function upsertMessage(
  messages: ChatMessage<Record<string, unknown>>[],
  nextMessage: ChatMessage<Record<string, unknown>>,
): ChatMessage<Record<string, unknown>>[] {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return replaceMessage(messages, nextMessage)
  }

  return [...messages, nextMessage]
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
