import type { ChatMessage, ChatTransport } from 'lee-chat-sdk'

export type SupportConversationStatus = 'unassigned' | 'assigned' | 'closed'

export interface SupportChatMetadata {
  agentName?: string
  customerEventIds?: string[]
  assignmentStatus?: SupportConversationStatus
}

export interface SupportChatRequest {
  content: string
  conversationId: string
  previousMessages: Array<ChatMessage<SupportChatMetadata>>
}

export interface SupportChatResponse {
  content: string
  metadata: SupportChatMetadata
}

const SUPPORT_CHAT_RESPONSE = {
  AGENT_NAME: 'Mina',
  DEFAULT_EVENT_ID: 'customer-opened-pricing',
  ASSIGNED_STATUS: 'assigned' as const,
} as const

export function createSupportChatTransport(): ChatTransport<
  SupportChatRequest,
  SupportChatResponse
> {
  return {
    async sendMessage(request) {
      return {
        content: `상담원 ${SUPPORT_CHAT_RESPONSE.AGENT_NAME}: "${request.content}" 내용을 확인했어요. 필요한 정보를 이어서 도와드릴게요.`,
        metadata: {
          agentName: SUPPORT_CHAT_RESPONSE.AGENT_NAME,
          customerEventIds: [SUPPORT_CHAT_RESPONSE.DEFAULT_EVENT_ID],
          assignmentStatus: SUPPORT_CHAT_RESPONSE.ASSIGNED_STATUS,
        },
      }
    },
  }
}
