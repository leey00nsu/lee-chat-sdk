# Backend Contract

`lee-chat-sdk` is client-side only. Host applications provide the HTTP and realtime endpoints that the SDK calls.

## Message Endpoint

Configure the widget with `endpoint: '/api/chat'`. The SDK sends one POST request for each user message.

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'

export async function handleChatRequest(
  requestBody: LeeChatRequest,
): Promise<LeeChatResponse> {
  const text = requestBody.message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  return {
    message: {
      content: `Received: ${text}`,
      metadata: {
        handledBy: 'example-server',
      },
    },
  }
}
```

The SDK expects the response shape below. If `id`, `parts`, or `createdAt` are missing, the client fills them.

```ts
interface LeeChatResponse {
  message: {
    id?: string
    content: string
    parts?: ChatMessagePart[]
    createdAt?: string
    metadata?: Record<string, unknown>
  }
}
```

## Next.js Route Example

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'

export async function POST(request: Request) {
  const body = (await request.json()) as LeeChatRequest
  const response: LeeChatResponse = {
    message: {
      content: `Received: ${body.message.content}`,
    },
  }

  return Response.json(response)
}
```

## Reference In-Memory Backend

For local development, examples, and contract tests, `lee-chat-sdk/server` provides a request-handler style backend. It stores conversations, messages, and read receipts in memory, so replace it with durable storage for production.

```ts
// app/api/chat/route.ts
import { createInMemoryLeeChatBackend } from 'lee-chat-sdk/server'

const backend = createInMemoryLeeChatBackend({
  getResponse: async ({ request }) => ({
    message: {
      content: `Received: ${request.message.content}`,
      metadata: {
        handledBy: 'reference-backend',
      },
    },
  }),
})

export function POST(request: Request) {
  return backend.handleRequest(request)
}

export function GET(request: Request) {
  return backend.handleRequest(request)
}

export function PUT(request: Request) {
  return backend.handleRequest(request)
}
```

The default `basePath` is `/api/chat`, matching the widget `endpoint`. Configure `basePath` if your route is mounted elsewhere.

## Production Storage Adapter

For production routes, use `createLeeChatRouteHandler()` and provide durable storage. The helper keeps the SDK HTTP contract, route matching, response parsing, assistant/user message construction, conversation sync, and read receipt response shape in one place while your app owns database writes and reads.

```ts
// app/api/chat/route.ts
import {
  createLeeChatRouteHandler,
  type LeeChatRouteHandlerStorage,
} from 'lee-chat-sdk/server'

const storage: LeeChatRouteHandlerStorage<{ tenantId: string }> = {
  createContext: async (request) => ({
    tenantId: await resolveTenantId(request),
  }),
  upsertConversation: async (conversation, context) => {
    await db.conversation.upsert({
      tenantId: context.tenantId,
      conversation,
    })
  },
  appendMessages: async (messages, context) => {
    await db.message.insertMany({
      tenantId: context.tenantId,
      messages,
    })
  },
  listConversations: async (params, context) => ({
    conversations: await db.conversation.findMany({
      tenantId: context.tenantId,
      ...params,
    }),
  }),
  listMessages: async (params, context) => ({
    messages: await db.message.findMany({
      tenantId: context.tenantId,
      ...params,
    }),
  }),
  upsertReadReceipt: async (readReceipt, context) => {
    await db.readReceipt.upsert({
      tenantId: context.tenantId,
      readReceipt,
    })
  },
}

const handler = createLeeChatRouteHandler({
  storage,
  assistantSenderId: 'support-assistant',
  getResponse: async ({ request }) => ({
    message: {
      content: await generateAssistantReply(request),
    },
  }),
})

export function POST(request: Request) {
  return handler.handleRequest(request)
}

export function GET(request: Request) {
  return handler.handleRequest(request)
}

export function PUT(request: Request) {
  return handler.handleRequest(request)
}
```

## Conversation Sync Endpoints

`ConversationSyncClient` uses REST endpoints derived from the same base endpoint.

- `GET /api/chat/conversations?appId=...&visitorId=...&participantId=...&cursor=...&limit=...`
- `GET /api/chat/conversations/:conversationId/messages?cursor=...&limit=...`
- `PUT /api/chat/conversations/:conversationId/read`

Pass a `ConversationSyncClient` or compatible object to the widget when you want the SDK to mark unread messages as read as the visitor opens the panel.

```tsx
import {
  ConversationSyncClient,
  LeeChatProvider,
  LeeChatWidget,
} from 'lee-chat-sdk'

const syncClient = new ConversationSyncClient({
  endpoint: '/api/chat',
})

export function App() {
  return (
    <LeeChatProvider
      config={{
        appId: 'commerce-web',
        endpoint: '/api/chat',
      }}
      syncClient={syncClient}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
```

The read sync call sends the latest unread message id, the current conversation id, and the current participant id. The returned `readReceipt` is applied to local widget state so closing the widget does not re-count the message as unread.

Expected response shapes:

```ts
type ListConversationsResponse = {
  conversations: ChatConversation[]
  nextCursor?: string
}

type ListMessagesResponse = {
  messages: ChatMessage[]
  nextCursor?: string
}

type MarkMessageReadResponse = {
  readReceipt: ChatReadReceipt
}
```

## Realtime Events

`SseChatEventTransport` and `WebSocketChatEventTransport` expect JSON payloads compatible with `ConversationClientEvent`.

```ts
type ConversationClientEvent =
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
```

Browser `EventSource` and `WebSocket` APIs do not support arbitrary request headers. Use cookie auth or pass short-lived tokens in a dynamic endpoint function:

```ts
const eventTransport = new SseChatEventTransport({
  endpoint: () => `/api/chat/events?token=${authStore.accessToken}`,
  auth: {
    refresh: () => authStore.refresh(),
  },
  reconnect: {
    enabled: true,
  },
})
```

For a simple SSE backend, use `createLeeChatEventStream()` from `lee-chat-sdk/server`. Keep the stream instance module-scoped so multiple route calls share the same subscriber set.

```ts
// app/api/chat/events/route.ts
import { createLeeChatEventStream } from 'lee-chat-sdk/server'

export const chatEvents = createLeeChatEventStream()

export function GET(request: Request) {
  return chatEvents.createSseResponse({ request })
}
```

Publish events from your message/read/presence handlers:

```ts
chatEvents.publish({
  type: 'message.read',
  readReceipt: {
    conversationId: 'conversation-1',
    messageId: 'message-1',
    participantId: 'visitor-1',
    readAt: new Date().toISOString(),
  },
})
```

## Mock Server For Tests And Demos

Use `lee-chat-sdk/testing` when you need a local contract-compatible backend without implementing routes yet.

```ts
import { createMockLeeChatServer } from 'lee-chat-sdk/testing'

const mockServer = createMockLeeChatServer({
  getResponse: ({ request }) => ({
    message: {
      content: `Mock response: ${request.message.content}`,
    },
  }),
})

// React Provider / Vanilla init
mockServer.fetch

// ConversationSyncClient-compatible object
mockServer.syncClient

// ChatEventTransport-compatible object
mockServer.eventTransport
```

The mock server stores conversations and messages from SDK POST requests, exposes list/read sync methods, and lets tests emit realtime events with `mockServer.emitEvent(event)`.
