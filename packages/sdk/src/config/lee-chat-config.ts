export type LeeChatPosition = 'bottom-right' | 'bottom-left'
export type LeeChatPersistenceType = 'memory' | 'localStorage'
export type LeeChatColorScheme = 'light' | 'dark' | 'system'

export interface LeeChatUser {
  id: string
  name?: string
  email?: string
}

export interface LeeChatWidgetText {
  title: string
  subtitle: string
  triggerLabel: string
  placeholder: string
  send: string
  sending: string
  error: string
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
  composer?: string
}

export interface LeeChatConfig {
  appId: string
  endpoint: string
  user?: LeeChatUser
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
  extends Omit<LeeChatConfig, 'texts' | 'theme' | 'position' | 'initialOpen' | 'persistence'> {
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
  error: 'Message failed. Please try again.',
}

const DEFAULT_LEE_CHAT_THEME: LeeChatTheme = {
  colorScheme: 'light',
  primaryColor: '#111827',
  radius: '12px',
}

export function resolveLeeChatConfig(
  config: LeeChatConfig,
): ResolvedLeeChatConfig {
  return {
    ...config,
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
