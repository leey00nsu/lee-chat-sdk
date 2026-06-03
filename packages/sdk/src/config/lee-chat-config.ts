import type { ChatConversationKind } from '../model/chat-conversation'
import type { ChatParticipant, ChatParticipantKind } from '../model/chat-participant'
import type {
  HttpChatTransportAuthOptions,
  HttpChatTransportHeaders,
  HttpChatTransportRetryOptions,
} from '../transport/http-chat-transport'

export type LeeChatPosition = 'bottom-right' | 'bottom-left'
export type LeeChatPersistenceType = 'memory' | 'localStorage'
export type LeeChatColorScheme = 'light' | 'dark' | 'system'

export interface LeeChatVisitor {
  id?: string
  metadata?: Record<string, unknown>
}

export interface LeeChatParticipant {
  id: string
  kind?: ChatParticipantKind
  displayName?: string
  email?: string
  metadata?: Record<string, unknown>
}

export interface LeeChatConversationConfig {
  id?: string
  kind?: ChatConversationKind
  metadata?: Record<string, unknown>
}

export interface LeeChatWidgetText {
  title: string
  subtitle: string
  triggerLabel: string
  placeholder: string
  send: string
  sending: string
  messageSending: string
  assistantLoading: string
  participantOnline: string
  participantTyping: string
  messageRead: string
  error: string
  retry: string
}

export interface LeeChatTheme {
  colorScheme: LeeChatColorScheme
  primaryColor: string
  radius: string
}

export interface LeeChatClassName {
  root?: string
  trigger?: string
  panel?: string
  header?: string
  messageList?: string
  message?: string
  messageStatus?: string
  retryButton?: string
  assistantLoading?: string
  participantStatus?: string
  typingIndicator?: string
  readReceipt?: string
  composer?: string
}

export interface LeeChatConfig {
  appId: string
  endpoint: string
  visitor?: LeeChatVisitor
  conversation?: LeeChatConversationConfig
  participant?: LeeChatParticipant
  metadata?: Record<string, unknown>
  position?: LeeChatPosition
  initialOpen?: boolean
  initialMessage?: string
  requestHeaders?: HttpChatTransportHeaders
  requestAuth?: HttpChatTransportAuthOptions
  requestTimeoutMs?: number
  requestRetry?: HttpChatTransportRetryOptions
  persistence?: LeeChatPersistenceType
  texts?: Partial<LeeChatWidgetText>
  theme?: Partial<LeeChatTheme>
  className?: LeeChatClassName
}

export interface ResolvedLeeChatConfig
  extends Omit<
    LeeChatConfig,
    'texts' | 'theme' | 'position' | 'initialOpen' | 'persistence' | 'conversation' | 'participant'
  > {
  visitor: Required<Pick<LeeChatVisitor, 'id'>> & Pick<LeeChatVisitor, 'metadata'>
  conversation: Required<Pick<LeeChatConversationConfig, 'id' | 'kind'>> &
    Pick<LeeChatConversationConfig, 'metadata'>
  participant: ChatParticipant
  position: LeeChatPosition
  initialOpen: boolean
  persistence: LeeChatPersistenceType
  texts: LeeChatWidgetText
  theme: LeeChatTheme
}

const DEFAULT_LEE_CHAT_TEXTS: LeeChatWidgetText = {
  title: 'Chat',
  subtitle: 'Send us a message.',
  triggerLabel: 'Open chat',
  placeholder: 'Type your message',
  send: 'Send',
  sending: 'Sending',
  messageSending: 'Sending...',
  assistantLoading: 'Assistant is typing...',
  participantOnline: 'Online',
  participantTyping: 'Participant is typing...',
  messageRead: 'Read',
  error: 'Message failed. Please try again.',
  retry: 'Retry',
}

const DEFAULT_LEE_CHAT_THEME: LeeChatTheme = {
  colorScheme: 'light',
  primaryColor: '#111827',
  radius: '12px',
}

const LEE_CHAT_VISITOR_STORAGE = {
  KEY_PREFIX: 'lee-chat',
  KEY_SUFFIX: 'visitor',
} as const

export function resolveLeeChatConfig(
  config: LeeChatConfig,
): ResolvedLeeChatConfig {
  const visitorId = resolveVisitorId(config)
  const participantId = config.participant?.id ?? visitorId
  const conversationId =
    config.conversation?.id ?? `${config.appId}:conversation:${participantId}`

  return {
    ...config,
    visitor: {
      id: visitorId,
      metadata: config.visitor?.metadata,
    },
    conversation: {
      id: conversationId,
      kind: config.conversation?.kind ?? 'support',
      metadata: config.conversation?.metadata,
    },
    participant: {
      id: participantId,
      kind: config.participant?.kind ?? 'user',
      displayName: config.participant?.displayName,
      metadata: config.participant?.metadata,
    },
    position: config.position ?? 'bottom-right',
    initialOpen: config.initialOpen ?? false,
    persistence: config.persistence ?? 'memory',
    texts: {
      ...DEFAULT_LEE_CHAT_TEXTS,
      ...config.texts,
    },
    theme: {
      ...DEFAULT_LEE_CHAT_THEME,
      ...config.theme,
    },
  }
}

function resolveVisitorId(config: LeeChatConfig): string {
  if (config.visitor?.id) {
    return config.visitor.id
  }

  const storageKey = createVisitorStorageKey(config.appId)
  const persistedVisitorId = readVisitorId(storageKey)

  if (persistedVisitorId) {
    return persistedVisitorId
  }

  const nextVisitorId = createVisitorId()
  writeVisitorId(storageKey, nextVisitorId)

  return nextVisitorId
}

function createVisitorStorageKey(appId: string): string {
  return `${LEE_CHAT_VISITOR_STORAGE.KEY_PREFIX}:${appId}:${LEE_CHAT_VISITOR_STORAGE.KEY_SUFFIX}`
}

function readVisitorId(storageKey: string): string | undefined {
  if (globalThis.window === undefined) {
    return undefined
  }

  return globalThis.localStorage.getItem(storageKey) ?? undefined
}

function writeVisitorId(storageKey: string, visitorId: string): void {
  if (globalThis.window === undefined) {
    return
  }

  globalThis.localStorage.setItem(storageKey, visitorId)
}

function createVisitorId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `visitor-${Date.now().toString(36)}`
}
