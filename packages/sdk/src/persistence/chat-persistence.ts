export interface ChatPersistence<TMessage> {
  read(): TMessage[]
  write(messages: TMessage[]): void
  clear(): void
}
