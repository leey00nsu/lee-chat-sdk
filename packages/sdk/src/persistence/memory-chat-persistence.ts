import type { ChatPersistence } from './chat-persistence'

export class MemoryChatPersistence<TMessage>
  implements ChatPersistence<TMessage>
{
  private messages: TMessage[]

  constructor(initialMessages: TMessage[] = []) {
    this.messages = initialMessages
  }

  read(): TMessage[] {
    return [...this.messages]
  }

  write(messages: TMessage[]): void {
    this.messages = [...messages]
  }

  clear(): void {
    this.messages = []
  }
}
