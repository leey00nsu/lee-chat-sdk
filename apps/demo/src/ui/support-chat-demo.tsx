'use client'

import { useState } from 'react'
import {
  ChatComposer,
  ChatMessageList,
  ChatWidgetShell,
  FloatingChatTrigger,
  MemoryChatPersistence,
  useChatController,
  type ChatMessage,
} from 'lee-chat-sdk'
import {
  createSupportChatTransport,
  type SupportChatMetadata,
  type SupportChatRequest,
  type SupportChatResponse,
} from '../model/support-chat'

const SUPPORT_CHAT_DEMO = {
  CONVERSATION_ID: 'support-demo-conversation',
  INPUT_ID: 'support-chat-message',
} as const

const supportChatTransport = createSupportChatTransport()
const supportChatPersistence =
  new MemoryChatPersistence<ChatMessage<SupportChatMetadata>>()

function renderSupportMessage(message: ChatMessage<SupportChatMetadata>) {
  return (
    <article>
      <strong>{message.role}</strong>
      <p>{message.content}</p>
      {message.metadata?.assignmentStatus ? (
        <small>{message.metadata.assignmentStatus}</small>
      ) : null}
    </article>
  )
}

export function SupportChatDemo() {
  const [isOpen, setIsOpen] = useState(false)
  const chatController = useChatController<
    SupportChatRequest,
    SupportChatResponse,
    SupportChatMetadata
  >({
    conversationId: SUPPORT_CHAT_DEMO.CONVERSATION_ID,
    transport: supportChatTransport,
    persistence: supportChatPersistence,
    buildRequest: ({ content, conversationId, messages }) => ({
      content,
      conversationId,
      previousMessages: messages,
    }),
    buildAssistantMessage: ({ response }) => ({
      content: response.content,
      metadata: response.metadata,
    }),
  })

  return (
    <div>
      {isOpen ? (
        <ChatWidgetShell
          title="Support Chat Demo"
          description="SDK metadata로 상담 상태와 고객 이벤트를 전달합니다."
          footer={
            <ChatComposer
              inputId={SUPPORT_CHAT_DEMO.INPUT_ID}
              label="상담 메시지"
              value={chatController.inputValue}
              placeholder="문의 내용을 입력하세요"
              submitLabel={chatController.isSubmitting ? '전송 중' : '보내기'}
              isLoading={chatController.isSubmitting}
              onChange={chatController.setInputValue}
              onSubmit={() => {
                void chatController.submitMessage()
              }}
            />
          }
        >
          <ChatMessageList
            messages={chatController.messages}
            renderMessage={renderSupportMessage}
          />
        </ChatWidgetShell>
      ) : null}

      <FloatingChatTrigger
        label={isOpen ? '상담 닫기' : '상담 열기'}
        isOpen={isOpen}
        onClick={() => setIsOpen((previousIsOpen) => !previousIsOpen)}
      />
    </div>
  )
}
