import type { ChatPersistence } from './chat-persistence'

interface LocalStorageChatPersistenceParams<TMessage> {
  storageKey: string
  storageVersion: number
  validateMessages: (messages: unknown) => TMessage[]
}

interface PersistedChatMessagesPayload {
  version: number
  messages: unknown
}

function isPersistedChatMessagesPayload(
  value: unknown,
): value is PersistedChatMessagesPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'messages' in value
  )
}

export class LocalStorageChatPersistence<TMessage>
  implements ChatPersistence<TMessage>
{
  private readonly storageKey: string
  private readonly storageVersion: number
  private readonly validateMessages: (messages: unknown) => TMessage[]

  constructor({
    storageKey,
    storageVersion,
    validateMessages,
  }: LocalStorageChatPersistenceParams<TMessage>) {
    this.storageKey = storageKey
    this.storageVersion = storageVersion
    this.validateMessages = validateMessages
  }

  read(): TMessage[] {
    if (globalThis.window === undefined) {
      return []
    }

    const persistedValue = globalThis.localStorage.getItem(this.storageKey)

    if (!persistedValue) {
      return []
    }

    let parsedValue: unknown

    try {
      parsedValue = JSON.parse(persistedValue)
    } catch {
      return []
    }

    if (!isPersistedChatMessagesPayload(parsedValue)) {
      return []
    }

    if (parsedValue.version !== this.storageVersion) {
      return []
    }

    return this.validateMessages(parsedValue.messages)
  }

  write(messages: TMessage[]): void {
    if (globalThis.window === undefined) {
      return
    }

    globalThis.localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        version: this.storageVersion,
        messages,
      }),
    )
  }

  clear(): void {
    if (globalThis.window === undefined) {
      return
    }

    globalThis.localStorage.removeItem(this.storageKey)
  }
}
