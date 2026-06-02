'use client'

import { LeeChatProvider, LeeChatWidget, type LeeChatRequest } from 'lee-chat-sdk'

const SUPPORT_CHAT_DEMO = {
  APP_ID: 'support-demo',
  ENDPOINT: '/api/support-chat',
  PARTICIPANT_ID: 'demo-user',
} as const

async function supportDemoFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const requestBody = JSON.parse(String(init?.body)) as LeeChatRequest
  const requestText = requestBody.message.parts
    .filter((part) => {
      return part.type === 'text'
    })
    .map((part) => {
      return part.text
    })
    .join('')

  return new Response(
    JSON.stringify({
      message: {
        content: `Support received: ${requestText}`,
        metadata: {
          agentName: 'Mina',
          assignmentStatus: 'assigned',
        },
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Lee-Chat-Demo-Endpoint': String(input),
      },
    },
  )
}

export function SupportChatDemo() {
  return (
    <LeeChatProvider
      config={{
        appId: SUPPORT_CHAT_DEMO.APP_ID,
        endpoint: SUPPORT_CHAT_DEMO.ENDPOINT,
        conversation: {
          kind: 'support',
        },
        participant: {
          id: SUPPORT_CHAT_DEMO.PARTICIPANT_ID,
          kind: 'user',
          displayName: 'Demo User',
        },
        texts: {
          title: 'Support Chat Demo',
          subtitle: 'Drop-in widget powered by lee-chat-sdk.',
          triggerLabel: 'Open support chat',
        },
        className: {
          root: 'support-demo-chat-root',
        },
      }}
      fetchImplementation={supportDemoFetch}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
