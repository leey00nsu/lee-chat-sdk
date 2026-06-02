import { createChatMessageId } from '../lib/create-chat-message-id'
import {
  createTextMessageParts,
  type ChatMessage,
  type ChatMessagePart,
} from '../model/chat-message'
import type { ChatPersistence } from '../persistence/chat-persistence'
import type { ChatTransport } from '../transport/chat-transport'

export interface BuildConversationRequestParams<TMessageMetadata> {
  content: string
  conversationId: string
  messages: Array<ChatMessage<TMessageMetadata>>
}

export interface BuildConversationAssistantMessageParams<
  TResponse,
  TMessageMetadata,
> {
  response: TResponse
  requestContent: string
  conversationId: string
  messages: Array<ChatMessage<TMessageMetadata>>
}

export interface BuiltConversationAssistantMessage<TMessageMetadata> {
  content: string
  parts?: ChatMessagePart[]
  metadata?: TMessageMetadata
}

export interface ConversationClientParams<
  TRequest,
  TResponse,
  TMessageMetadata = unknown,
> {
  conversationId: string
  senderId: string
  assistantSenderId: string
  transport: ChatTransport<TRequest, TResponse>
  buildRequest: (
    params: BuildConversationRequestParams<TMessageMetadata>,
  ) => TRequest
  buildAssistantMessage: (
    params: BuildConversationAssistantMessageParams<
      TResponse,
      TMessageMetadata
    >,
  ) => BuiltConversationAssistantMessage<TMessageMetadata>
  persistence?: ChatPersistence<ChatMessage<TMessageMetadata>>
  onMessagesChange?: (messages: Array<ChatMessage<TMessageMetadata>>) => void
  createMessageId?: () => string
  getCurrentDate?: () => Date
}

export interface ConversationClientMutationResult<TMessageMetadata = unknown> {
  messages: Array<ChatMessage<TMessageMetadata>>
}

function replaceMessage<TMessageMetadata>(
  messages: Array<ChatMessage<TMessageMetadata>>,
  nextMessage: ChatMessage<TMessageMetadata>,
): Array<ChatMessage<TMessageMetadata>> {
  return messages.map((message) => {
    if (message.id !== nextMessage.id) {
      return message
    }

    return nextMessage
  })
}

export class ConversationClient<
  TRequest,
  TResponse,
  TMessageMetadata = unknown,
> {
  private messages: Array<ChatMessage<TMessageMetadata>>
  private readonly conversationId: string
  private readonly senderId: string
  private readonly assistantSenderId: string
  private readonly transport: ChatTransport<TRequest, TResponse>
  private readonly buildRequest: (
    params: BuildConversationRequestParams<TMessageMetadata>,
  ) => TRequest
  private readonly buildAssistantMessage: (
    params: BuildConversationAssistantMessageParams<
      TResponse,
      TMessageMetadata
    >,
  ) => BuiltConversationAssistantMessage<TMessageMetadata>
  private readonly persistence?: ChatPersistence<ChatMessage<TMessageMetadata>>
  private readonly onMessagesChange?: (
    messages: Array<ChatMessage<TMessageMetadata>>,
  ) => void
  private readonly createMessageId: () => string
  private readonly getCurrentDate: () => Date

  constructor({
    conversationId,
    senderId,
    assistantSenderId,
    transport,
    buildRequest,
    buildAssistantMessage,
    persistence,
    onMessagesChange,
    createMessageId = createChatMessageId,
    getCurrentDate = () => new Date(),
  }: ConversationClientParams<TRequest, TResponse, TMessageMetadata>) {
    this.conversationId = conversationId
    this.senderId = senderId
    this.assistantSenderId = assistantSenderId
    this.transport = transport
    this.buildRequest = buildRequest
    this.buildAssistantMessage = buildAssistantMessage
    this.persistence = persistence
    this.onMessagesChange = onMessagesChange
    this.createMessageId = createMessageId
    this.getCurrentDate = getCurrentDate
    this.messages = persistence?.read() ?? []
  }

  getMessages(): Array<ChatMessage<TMessageMetadata>> {
    return this.messages
  }

  clearMessages(): Array<ChatMessage<TMessageMetadata>> {
    this.messages = []
    this.persistence?.clear()
    this.onMessagesChange?.(this.messages)

    return this.messages
  }

  async submitMessage(
    content: string,
  ): Promise<ConversationClientMutationResult<TMessageMetadata>> {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return {
        messages: this.messages,
      }
    }

    const userMessage: ChatMessage<TMessageMetadata> = {
      id: this.createMessageId(),
      conversationId: this.conversationId,
      senderId: this.senderId,
      role: 'user',
      content: trimmedContent,
      parts: createTextMessageParts(trimmedContent),
      status: 'sending',
      createdAt: this.getCurrentDate().toISOString(),
    }
    const requestMessages = this.messages

    this.updateMessages([...this.messages, userMessage])

    return this.sendUserMessage({
      userMessage,
      requestMessages,
    })
  }

  async retryMessage(
    messageId: string,
  ): Promise<ConversationClientMutationResult<TMessageMetadata>> {
    const failedMessage = this.messages.find((message) => {
      return message.id === messageId && message.status === 'failed'
    })

    if (!failedMessage) {
      return {
        messages: this.messages,
      }
    }

    const retryingMessage: ChatMessage<TMessageMetadata> = {
      ...failedMessage,
      status: 'sending',
    }

    this.updateMessages(replaceMessage(this.messages, retryingMessage))

    return this.sendUserMessage({
      userMessage: retryingMessage,
      requestMessages: this.messages.filter((message) => {
        return message.id !== messageId
      }),
    })
  }

  private async sendUserMessage({
    userMessage,
    requestMessages,
  }: {
    userMessage: ChatMessage<TMessageMetadata>
    requestMessages: Array<ChatMessage<TMessageMetadata>>
  }): Promise<ConversationClientMutationResult<TMessageMetadata>> {
    try {
      const response = await this.transport.sendMessage(
        this.buildRequest({
          content: userMessage.content,
          conversationId: this.conversationId,
          messages: requestMessages,
        }),
      )
      const builtAssistantMessage = this.buildAssistantMessage({
        response,
        requestContent: userMessage.content,
        conversationId: this.conversationId,
        messages: this.messages,
      })
      const sentUserMessage: ChatMessage<TMessageMetadata> = {
        ...userMessage,
        status: 'sent',
      }
      const assistantMessage: ChatMessage<TMessageMetadata> = {
        id: this.createMessageId(),
        conversationId: this.conversationId,
        senderId: this.assistantSenderId,
        role: 'assistant',
        content: builtAssistantMessage.content,
        parts:
          builtAssistantMessage.parts ??
          createTextMessageParts(builtAssistantMessage.content),
        status: 'sent',
        createdAt: this.getCurrentDate().toISOString(),
        metadata: builtAssistantMessage.metadata,
      }

      this.updateMessages([
        ...replaceMessage(this.messages, sentUserMessage),
        assistantMessage,
      ])
    } catch {
      this.updateMessages(
        replaceMessage(this.messages, {
          ...userMessage,
          status: 'failed',
        }),
      )
    }

    return {
      messages: this.messages,
    }
  }

  private updateMessages(messages: Array<ChatMessage<TMessageMetadata>>): void {
    this.messages = messages
    this.persistence?.write(this.messages)
    this.onMessagesChange?.(this.messages)
  }
}
