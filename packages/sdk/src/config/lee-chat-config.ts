import type { ChatConversationKind } from '../model/chat-conversation'
import type { ChatParticipant, ChatParticipantKind } from '../model/chat-participant'

export type LeeChatPosition = 'bottom-right' | 'bottom-left'
export type LeeChatPersistenceType = 'memory' | 'localStorage'
export type LeeChatColorScheme = 'light' | 'dark' | 'system'

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
  composer?: string
}

export interface LeeChatConfig {
  appId: string
  endpoint: string
  conversation?: LeeChatConversationConfig
  participant?: LeeChatParticipant
  metadata?: Record<string, unknown>
  position?: LeeChatPosition
  initialOpen?: boolean
  initialMessage?: string
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
  error: 'Message failed. Please try again.',
  retry: 'Retry',
}

const DEFAULT_LEE_CHAT_THEME: LeeChatTheme = {
  colorScheme: 'light',
  primaryColor: '#111827',
  radius: '12px',
}

export function resolveLeeChatConfig(
  config: LeeChatConfig,
): ResolvedLeeChatConfig {
  const conversationId = config.conversation?.id ?? `${config.appId}:conversation`

  return {
    ...config,
    conversation: {
      id: conversationId,
      kind: config.conversation?.kind ?? 'support',
      metadata: config.conversation?.metadata,
    },
    participant: {
      id: config.participant?.id ?? `${config.appId}-participant`,
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
