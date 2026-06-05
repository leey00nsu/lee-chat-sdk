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

## Attachment Upload Endpoint

The SDK does not upload files directly to your storage. The host app owns the upload endpoint and passes an `uploadAttachment(file)` function to React, Vanilla, or script-tag integrations. That function must upload the file, then return an `UploadedChatAttachment` object. The SDK converts that object into an `image` or `file` message part and includes it in the next `LeeChatRequest.message.parts` payload.

A practical route shape is:

- `POST /api/chat/attachments`
- request body: `multipart/form-data` with a `file` field
- response body: `UploadedChatAttachment`

```ts
type UploadedChatAttachment =
  | {
      kind: 'image'
      url: string
      alt?: string
      mediaType?: string
      width?: number
      height?: number
    }
  | {
      kind: 'file'
      url: string
      name: string
      mediaType?: string
      size?: number
    }
```

Example client wiring:

```tsx
import { LeeChatWidget, type UploadedChatAttachment } from 'lee-chat-sdk'

async function uploadAttachment(file: File): Promise<UploadedChatAttachment> {
  const body = new FormData()
  body.set('file', file)

  const response = await fetch('/api/chat/attachments', {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    throw new Error('Attachment upload failed.')
  }

  return (await response.json()) as UploadedChatAttachment
}

export function ChatWidget() {
  return <LeeChatWidget uploadAttachment={uploadAttachment} />
}
```

Example Next.js route:

```ts
// app/api/chat/attachments/route.ts
import type { UploadedChatAttachment } from 'lee-chat-sdk'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_MEDIA_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
])

export async function POST(request: Request) {
  const context = await requireChatRequestContext(request)
  await assertRateLimit({
    tenantId: context.tenantId,
    subjectId: context.participantId ?? context.visitorId,
    action: 'chat.attachment.upload',
  })

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing file.' }, { status: 400 })
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return Response.json({ error: 'Attachment is too large.' }, { status: 413 })
  }

  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    return Response.json({ error: 'Unsupported attachment type.' }, { status: 415 })
  }

  const storedFile = await storage.uploadChatAttachment({
    tenantId: context.tenantId,
    file,
  })

  const attachment: UploadedChatAttachment = file.type.startsWith('image/')
    ? {
        kind: 'image',
        url: storedFile.publicUrl,
        alt: file.name,
        mediaType: file.type,
      }
    : {
        kind: 'file',
        url: storedFile.publicUrl,
        name: file.name,
        mediaType: file.type,
        size: file.size,
      }

  await db.chatAttachment.create({
    tenantId: context.tenantId,
    uploadedBy: context.participantId ?? context.visitorId,
    attachment,
  })

  return Response.json(attachment)
}
```

Production attachment routes should validate auth, tenant, file size, MIME type, and storage destination. Use private object storage plus signed URLs when attachments should not be public.

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

## Production Next.js Route With Auth, Rate Limit, And Tenant Context

In production, wrap `createLeeChatRouteHandler()` with your own request context and infrastructure. The SDK helper keeps the chat route contract stable; your route owns auth, tenant isolation, permissions, rate limits, database access, and assistant response generation.

```ts
// app/api/chat/route.ts
import {
  createLeeChatRouteHandler,
  type LeeChatRouteHandlerStorage,
} from 'lee-chat-sdk/server'
import type { LeeChatRequest } from 'lee-chat-sdk'

interface ChatRequestContext {
  tenantId: string
  visitorId?: string
  participantId?: string
  role: 'visitor' | 'operator' | 'service'
}

const storage: LeeChatRouteHandlerStorage<ChatRequestContext> = {
  createContext: requireChatRequestContext,
  upsertConversation: async (conversation, context) => {
    await db.chatConversation.upsert({
      where: {
        tenantId_id: {
          tenantId: context.tenantId,
          id: conversation.id,
        },
      },
      create: {
        tenantId: context.tenantId,
        ...conversation,
      },
      update: {
        status: conversation.status,
        metadata: conversation.metadata,
      },
    })
  },
  appendMessages: async (messages, context) => {
    await db.chatMessage.createMany({
      data: messages.map((message) => ({
        tenantId: context.tenantId,
        ...message,
      })),
      skipDuplicates: true,
    })
  },
  listConversations: async (params, context) => {
    await assertCanListConversations(context, params)

    return {
      conversations: await db.chatConversation.findMany({
        where: {
          tenantId: context.tenantId,
          ...(params.participantId
            ? {
                participants: {
                  some: {
                    id: params.participantId,
                  },
                },
              }
            : {}),
        },
        take: params.limit ?? 50,
        cursor: params.cursor ? { id: params.cursor } : undefined,
      }),
    }
  },
  listMessages: async (params, context) => {
    await assertCanReadConversation(context, params.conversationId)

    return {
      messages: await db.chatMessage.findMany({
        where: {
          tenantId: context.tenantId,
          conversationId: params.conversationId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: params.limit ?? 100,
        cursor: params.cursor ? { id: params.cursor } : undefined,
      }),
    }
  },
  upsertReadReceipt: async (readReceipt, context) => {
    await assertCanReadConversation(context, readReceipt.conversationId)

    await db.chatReadReceipt.upsert({
      where: {
        tenantId_conversationId_messageId_participantId: {
          tenantId: context.tenantId,
          conversationId: readReceipt.conversationId,
          messageId: readReceipt.messageId,
          participantId: readReceipt.participantId,
        },
      },
      create: {
        tenantId: context.tenantId,
        ...readReceipt,
      },
      update: {
        readAt: readReceipt.readAt,
      },
    })
  },
}

const handler = createLeeChatRouteHandler<ChatRequestContext>({
  storage,
  assistantSenderId: ({ appId }) => `${appId}-assistant`,
  getResponse: async ({ request, storageContext }) => {
    await assertMessageBelongsToContext(request, storageContext)

    return {
      message: {
        content: await generateAssistantReply({
          tenantId: storageContext.tenantId,
          request,
        }),
        metadata: {
          handledBy: 'assistant',
        },
      },
    }
  },
})

export async function POST(request: Request) {
  return handleChatRoute(request)
}

export async function GET(request: Request) {
  return handleChatRoute(request)
}

export async function PUT(request: Request) {
  return handleChatRoute(request)
}

async function handleChatRoute(request: Request): Promise<Response> {
  try {
    return await handler.handleRequest(request)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }

    throw error
  }
}

async function requireChatRequestContext(
  request: Request,
): Promise<ChatRequestContext> {
  const session = await auth.verifyRequest(request)
  const tenant = await tenants.resolveFromRequest(request)

  if (!tenant) {
    throw new Response('Unknown tenant.', { status: 404 })
  }

  if (session) {
    await assertTenantMember({
      tenantId: tenant.id,
      userId: session.userId,
    })
    await assertRateLimit({
      tenantId: tenant.id,
      subjectId: session.userId,
      action: resolveChatRateLimitAction(request),
    })

    return {
      tenantId: tenant.id,
      participantId: session.userId,
      role: session.role === 'operator' ? 'operator' : 'visitor',
    }
  }

  const visitorId = await visitors.resolveSignedVisitorId(request)
  await assertRateLimit({
    tenantId: tenant.id,
    subjectId: visitorId,
    action: resolveChatRateLimitAction(request),
  })

  return {
    tenantId: tenant.id,
    visitorId,
    role: 'visitor',
  }
}

async function assertMessageBelongsToContext(
  request: LeeChatRequest,
  context: ChatRequestContext,
): Promise<void> {
  if (request.appId !== context.tenantId) {
    throw new Response('Invalid appId for tenant.', { status: 403 })
  }

  if (
    context.participantId &&
    request.participant.id !== context.participantId
  ) {
    throw new Response('Invalid participant.', { status: 403 })
  }

  if (context.visitorId && request.visitor.id !== context.visitorId) {
    throw new Response('Invalid visitor.', { status: 403 })
  }
}

function resolveChatRateLimitAction(request: Request): string {
  if (request.method === 'POST') {
    return 'chat.message.create'
  }

  if (request.method === 'PUT') {
    return 'chat.read-receipt.upsert'
  }

  return 'chat.sync.read'
}
```

The example uses placeholder `auth`, `tenants`, `visitors`, `db`, and `assertRateLimit` modules because those belong to the host application. The important contract is that every storage method receives the same `ChatRequestContext`, so tenant and permission checks are consistently applied to writes, reads, and read receipts.

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

## Realtime Publish From Storage Writes

For a single-process Next.js deployment, keep the event stream in a shared module and publish after durable writes complete. This keeps HTTP sync and realtime subscribers consistent: the database remains the source of truth, and SSE/WebSocket events are notifications that a new state exists.

```ts
// app/api/chat/chat-events.ts
import { createLeeChatEventStream } from 'lee-chat-sdk/server'

export const chatEvents = createLeeChatEventStream()
```

```ts
// app/api/chat/events/route.ts
import { chatEvents } from '../chat-events'

export function GET(request: Request) {
  return chatEvents.createSseResponse({ request })
}
```

```ts
// app/api/chat/route.ts
import {
  createLeeChatRouteHandler,
  type LeeChatRouteHandlerStorage,
} from 'lee-chat-sdk/server'
import { chatEvents } from './chat-events'

const storage: LeeChatRouteHandlerStorage<ChatRequestContext> = {
  createContext: requireChatRequestContext,
  upsertConversation: async (conversation, context) => {
    await db.chatConversation.upsert({
      where: {
        tenantId_id: {
          tenantId: context.tenantId,
          id: conversation.id,
        },
      },
      create: {
        tenantId: context.tenantId,
        ...conversation,
      },
      update: {
        status: conversation.status,
        metadata: conversation.metadata,
      },
    })
  },
  appendMessages: async (messages, context) => {
    await db.chatMessage.createMany({
      data: messages.map((message) => ({
        tenantId: context.tenantId,
        ...message,
      })),
      skipDuplicates: true,
    })

    messages.forEach((message) => {
      chatEvents.publish({
        type: 'message.created',
        message,
      })
    })
  },
  listConversations: async (params, context) => {
    return {
      conversations: await db.chatConversation.findMany({
        where: {
          tenantId: context.tenantId,
          appId: params.appId,
        },
      }),
    }
  },
  listMessages: async (params, context) => {
    await assertCanReadConversation(context, params.conversationId)

    return {
      messages: await db.chatMessage.findMany({
        where: {
          tenantId: context.tenantId,
          conversationId: params.conversationId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    }
  },
  upsertReadReceipt: async (readReceipt, context) => {
    await db.chatReadReceipt.upsert({
      where: {
        tenantId_conversationId_messageId_participantId: {
          tenantId: context.tenantId,
          conversationId: readReceipt.conversationId,
          messageId: readReceipt.messageId,
          participantId: readReceipt.participantId,
        },
      },
      create: {
        tenantId: context.tenantId,
        ...readReceipt,
      },
      update: {
        readAt: readReceipt.readAt,
      },
    })

    chatEvents.publish({
      type: 'message.read',
      readReceipt,
    })
  },
}

export const chatRoute = createLeeChatRouteHandler({
  storage,
  getResponse: async ({ request, storageContext }) => ({
    message: {
      content: await generateAssistantReply({
        tenantId: storageContext.tenantId,
        request,
      }),
    },
  }),
})
```

`message.created` is useful for visitor widgets, operator consoles, and custom clients that need message fan-out after a durable write. The default React and Vanilla widgets upsert `message.created` into the active conversation when the event `message.conversationId` matches the current conversation.

For multi-instance deployments, do not rely on a module-scoped stream alone. Publish the same events through Redis pub/sub, NATS, Postgres listen/notify, or your platform broadcast layer, then fan them out to each process-local `createLeeChatEventStream()` subscriber set.

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
