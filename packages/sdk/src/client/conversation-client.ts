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
import type { ChatPersistence } from '../persistence/chat-persistence'
import type { ChatTransport } from '../transport/chat-transport'

export interface BuildConversationRequestParams<TMessageMetadata> {
  content: string
  parts: ChatMessagePart[]
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
  initialMessages?: Array<ChatMessage<TMessageMetadata>>
  persistence?: ChatPersistence<ChatMessage<TMessageMetadata>>
  onMessagesChange?: (messages: Array<ChatMessage<TMessageMetadata>>) => void
  onParticipantStateChange?: (state: ConversationParticipantState) => void
  createMessageId?: () => string
  getCurrentDate?: () => Date
}

export interface ConversationClientMutationResult<TMessageMetadata = unknown> {
  messages: Array<ChatMessage<TMessageMetadata>>
}

export interface SubmitConversationMessageParams {
  content: string
  parts?: ChatMessagePart[]
}

export interface ConversationParticipantState {
  presences: ChatParticipantPresence[]
  typingIndicators: ChatTypingIndicator[]
  readReceipts: ChatReadReceipt[]
}

export type ConversationClientEvent =
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

function upsertMessage<TMessageMetadata>(
  messages: Array<ChatMessage<TMessageMetadata>>,
  nextMessage: ChatMessage<TMessageMetadata>,
): Array<ChatMessage<TMessageMetadata>> {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return replaceMessage(messages, nextMessage)
  }

  return [...messages, nextMessage]
}

export class ConversationClient<
  TRequest,
  TResponse,
  TMessageMetadata = unknown,
> {
  private messages: Array<ChatMessage<TMessageMetadata>>
  private participantState: ConversationParticipantState
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
  private readonly onParticipantStateChange?: (
    state: ConversationParticipantState,
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
    initialMessages = [],
    persistence,
    onMessagesChange,
    onParticipantStateChange,
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
    this.onParticipantStateChange = onParticipantStateChange
    this.createMessageId = createMessageId
    this.getCurrentDate = getCurrentDate
    const persistedMessages = persistence?.read() ?? []
    this.messages =
      persistedMessages.length > 0 ? persistedMessages : initialMessages
    this.participantState = {
      presences: [],
      typingIndicators: [],
      readReceipts: [],
    }
  }

  getMessages(): Array<ChatMessage<TMessageMetadata>> {
    return this.messages
  }

  getParticipantState(): ConversationParticipantState {
    return this.participantState
  }

  applyEvent(event: ConversationClientEvent): ConversationParticipantState {
    if (event.type === 'message.created') {
      if (event.message.conversationId !== this.conversationId) {
        return this.participantState
      }

      this.updateMessages(
        upsertMessage(
          this.messages,
          event.message as ChatMessage<TMessageMetadata>,
        ),
      )

      return this.participantState
    }

    if (event.type === 'participant.presence_changed') {
      this.updateParticipantState({
        ...this.participantState,
        presences: replaceParticipantPresence(
          this.participantState.presences,
          event.presence,
        ),
      })

      return this.participantState
    }

    if (event.type === 'participant.typing_changed') {
      this.updateParticipantState({
        ...this.participantState,
        typingIndicators: replaceTypingIndicator(
          this.participantState.typingIndicators,
          event.typingIndicator,
        ),
      })

      return this.participantState
    }

    this.updateParticipantState({
      ...this.participantState,
      readReceipts: replaceReadReceipt(
        this.participantState.readReceipts,
        event.readReceipt,
      ),
    })

    return this.participantState
  }

  clearMessages(): Array<ChatMessage<TMessageMetadata>> {
    this.messages = []
    this.persistence?.clear()
    this.onMessagesChange?.(this.messages)

    return this.messages
  }

  async submitMessage(
    contentOrParams: string | SubmitConversationMessageParams,
  ): Promise<ConversationClientMutationResult<TMessageMetadata>> {
    const content =
      typeof contentOrParams === 'string'
        ? contentOrParams
        : contentOrParams.content
    const trimmedContent = content.trim()
    const parts =
      typeof contentOrParams === 'string'
        ? createTextMessageParts(trimmedContent)
        : contentOrParams.parts ?? createTextMessageParts(trimmedContent)

    if (!trimmedContent && parts.length === 0) {
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
      parts,
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
          parts: userMessage.parts,
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

  private updateParticipantState(state: ConversationParticipantState): void {
    this.participantState = state
    this.onParticipantStateChange?.(this.participantState)
  }
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
