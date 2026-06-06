import type {
  LeeChatConfig,
  LeeChatConversationConfig,
  LeeChatParticipant,
  LeeChatVisitor,
} from '../config/lee-chat-config'
import {
  createTextMessageParts,
  type ChatMessage,
} from '../model/chat-message'
import type {
  LeeChatRequest,
  LeeChatResponse,
} from '../request/lee-chat-request'

export interface MockLeeChatRequestOverrides
  extends Omit<
    Partial<LeeChatRequest>,
    'conversation' | 'participant' | 'visitor' | 'message'
  > {
  conversation?: Partial<LeeChatRequest['conversation']>
  participant?: Partial<LeeChatRequest['participant']>
  visitor?: Partial<LeeChatRequest['visitor']>
  message?: Partial<LeeChatRequest['message']>
}

export interface MockLeeChatResponseOverrides<TMessageMetadata>
  extends Omit<Partial<LeeChatResponse<TMessageMetadata>>, 'message'> {
  message?: Partial<LeeChatResponse<TMessageMetadata>['message']>
}

export interface MockLeeChatProviderConfigOverrides
  extends Omit<
    Partial<LeeChatConfig>,
    'visitor' | 'conversation' | 'participant'
  > {
  visitor?: Partial<LeeChatVisitor>
  conversation?: Partial<LeeChatConversationConfig>
  participant?: Partial<LeeChatParticipant>
}

const MOCK_LEE_CHAT = {
  APP_ID: 'test-app',
  CONVERSATION_ID: 'conversation-1',
  VISITOR_ID: 'visitor-test',
  USER_MESSAGE_ID: 'message-user-1',
  ASSISTANT_MESSAGE_ID: 'message-assistant-1',
  USER_CREATED_AT: '2026-01-01T00:00:00.000Z',
  ASSISTANT_CREATED_AT: '2026-01-01T00:00:01.000Z',
} as const

export function createMockLeeChatRequest(
  overrides: MockLeeChatRequestOverrides = {},
): LeeChatRequest {
  const messageContent = overrides.message?.content ?? 'Test question'

  return {
    appId: MOCK_LEE_CHAT.APP_ID,
    history: [],
    ...overrides,
    conversation: {
      id: MOCK_LEE_CHAT.CONVERSATION_ID,
      kind: 'support',
      ...overrides.conversation,
    },
    participant: {
      id: MOCK_LEE_CHAT.VISITOR_ID,
      kind: 'user',
      ...overrides.participant,
    },
    visitor: {
      id: MOCK_LEE_CHAT.VISITOR_ID,
      ...overrides.visitor,
    },
    message: {
      id: MOCK_LEE_CHAT.USER_MESSAGE_ID,
      senderId: MOCK_LEE_CHAT.VISITOR_ID,
      content: messageContent,
      parts: createTextMessageParts(messageContent),
      createdAt: MOCK_LEE_CHAT.USER_CREATED_AT,
      ...overrides.message,
    },
  }
}

export function createMockLeeChatResponse<
  TMessageMetadata = Record<string, unknown>,
>(
  overrides: MockLeeChatResponseOverrides<TMessageMetadata> = {},
): LeeChatResponse<TMessageMetadata> {
  const messageContent = overrides.message?.content ?? 'Test answer'

  return {
    ...overrides,
    message: {
      id: MOCK_LEE_CHAT.ASSISTANT_MESSAGE_ID,
      content: messageContent,
      parts: createTextMessageParts(messageContent),
      createdAt: MOCK_LEE_CHAT.ASSISTANT_CREATED_AT,
      ...overrides.message,
    },
  }
}

export function createMockChatMessage<
  TMessageMetadata = Record<string, unknown>,
>(
  overrides: Partial<ChatMessage<TMessageMetadata>> = {},
): ChatMessage<TMessageMetadata> {
  const content = overrides.content ?? 'Test message'

  return {
    id: MOCK_LEE_CHAT.USER_MESSAGE_ID,
    conversationId: MOCK_LEE_CHAT.CONVERSATION_ID,
    senderId: MOCK_LEE_CHAT.VISITOR_ID,
    role: 'user',
    content,
    parts: createTextMessageParts(content),
    status: 'sent',
    createdAt: MOCK_LEE_CHAT.USER_CREATED_AT,
    ...overrides,
  }
}

export function createMockLeeChatProviderConfig(
  overrides: MockLeeChatProviderConfigOverrides = {},
): LeeChatConfig {
  const {
    visitor,
    conversation,
    participant,
    ...configOverrides
  } = overrides

  return {
    appId: MOCK_LEE_CHAT.APP_ID,
    endpoint: '/api/chat',
    ...configOverrides,
    visitor: {
      id: MOCK_LEE_CHAT.VISITOR_ID,
      ...visitor,
    },
    ...(conversation
      ? {
          conversation: {
            ...conversation,
          },
        }
      : {}),
    ...(participant
      ? {
          participant: {
            id: participant.id ?? MOCK_LEE_CHAT.VISITOR_ID,
            ...participant,
          },
        }
      : {}),
  }
}
