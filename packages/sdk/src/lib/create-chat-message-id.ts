export function createChatMessageId(): string {
  return globalThis.crypto?.randomUUID() ?? `chat-message-${Date.now()}`
}
