# lee-chat-sdk

[한국어](./README.md) | English

`lee-chat-sdk` is a drop-in chat SDK for embedding chat experiences into websites. The default UI starts as a floating button in the bottom-right corner and opens a chat panel when clicked. It is built around a conversation model that can support customer support, AI assistants, direct conversations, and group-ready chat. Use it as React components in React apps, or call `initLeeChat()` from plain JavaScript.

## Quick Start

Import the CSS once from your app entry when using the default widget styles.

```ts
import 'lee-chat-sdk/style.css'
```

### React

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
        appId: 'my-service',
        endpoint: '/api/chat',
      }}
      syncClient={syncClient}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
```

### Vanilla JS

```ts
import { initLeeChat } from 'lee-chat-sdk/vanilla'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  initialMessage: 'How can I help?',
  isolation: 'shadowDom',
})

leeChat.open()
```

### Script Tag

For sites without a bundler, upload `dist/lee-chat.global.js` to a CDN and use the global `LeeChat` API. The IIFE bundle injects the default widget CSS.
The build also generates `dist/lee-chat.global.manifest.json` with the SRI `integrity` value.

```html
<script src="https://cdn.example.com/lee-chat.global.js"></script>
<script>
  LeeChat.initLeeChat({
    appId: 'my-service',
    endpoint: '/api/chat',
    initialMessage: 'How can I help?',
    isolation: 'shadowDom',
  })
</script>
```

## Installation

After publishing to npm:

```bash
pnpm add lee-chat-sdk
```

or:

```bash
npm install lee-chat-sdk
```

During local development, you can link it from a sibling workspace:

```bash
pnpm add lee-chat-sdk@file:../lee-chat-sdk/packages/sdk
```

## Default Behavior

- Renders a floating chat button in the bottom-right corner.
- Opens a chat panel, message list, composer, and send button.
- Creates and stores `visitor.id` in localStorage when `participant.id` is not provided, so the same browser visitor can be identified again.
- Derives the default `conversation.id` per visitor or participant.
- Shows `initialMessage` as an assistant welcome message when there is no stored conversation, without creating an automatic POST request.
- Syncs the latest unread message as a read receipt when the widget opens if `syncClient` is provided.
- Sends user messages to `endpoint` with POST.
- Adds the response as an assistant message.
- Can attach static or dynamic auth headers with `requestHeaders`.
- Can refresh expired auth with `requestAuth.refresh` and retry the request after responses such as 401.
- Can abort delayed requests with `requestTimeoutMs` and show them as failed messages.
- Can retry temporary 5xx/network failures with `requestRetry`.
- Supports `memory` or `localStorage` persistence.
- Exposes CSS custom properties and class hooks for styling.

## Configuration

```ts
import type { LeeChatConfig } from 'lee-chat-sdk'

const config: LeeChatConfig = {
  appId: 'commerce-web',
  endpoint: '/api/chat',
  conversation: {
    kind: 'support',
  },
  visitor: {
    id: 'visitor-123',
    metadata: {
      source: 'pricing-page',
    },
  },
  participant: {
    id: 'participant-user-123',
    kind: 'user',
    displayName: 'Lee',
    email: 'lee@example.com',
  },
  metadata: {
    plan: 'pro',
  },
  position: 'bottom-right',
  initialOpen: false,
  initialMessage: 'How can I help?',
  requestTimeoutMs: 15000,
  requestRetry: {
    maxAttempts: 2,
    delayMs: 300,
  },
  requestHeaders: () => ({
    Authorization: `Bearer ${getAccessToken()}`,
  }),
  requestAuth: {
    refresh: async () => {
      await refreshAccessToken()
    },
  },
  persistence: 'localStorage',
  texts: {
    title: 'Support',
    subtitle: 'Leave your question.',
    triggerLabel: 'Open support',
    placeholder: 'Type your message',
    send: 'Send',
    sending: 'Sending',
    messageSending: 'Sending...',
    assistantLoading: 'Assistant is typing...',
    participantOnline: 'Online',
    participantTyping: 'Participant is typing...',
    messageRead: 'Read',
    error: 'Message failed. Please try again.',
    retry: 'Retry',
  },
  theme: {
    colorScheme: 'light',
    primaryColor: '#111827',
    radius: '12px',
  },
}
```

## Authentication

`requestHeaders` accepts an object or a function. Functions are evaluated for every request, so refreshed tokens can be used immediately.

```ts
initLeeChat({
  appId: 'commerce-web',
  endpoint: '/api/chat',
  requestHeaders: () => ({
    Authorization: `Bearer ${authStore.accessToken}`,
  }),
  requestAuth: {
    refresh: async ({ status }) => {
      if (status === 401) {
        await authStore.refresh()
      }
    },
    refreshStatusCodes: [401],
    maxRefreshAttempts: 1,
  },
})
```

## Backend Contract

The SDK sends the following request body to `endpoint`.

Server endpoint examples and the realtime/sync contract are documented in [docs/backend-contract.md](./docs/backend-contract.md).
For tests and demos, use `createMockLeeChatServer()` from `lee-chat-sdk/testing` to simulate the same contract locally.
For local development and contract validation routes, use `createInMemoryLeeChatBackend()` from `lee-chat-sdk/server`. It stores data in memory, so replace it with durable storage for production.
For production routes, connect your database storage adapter to `createLeeChatRouteHandler()` from the same subpath to reuse the message storage, conversation sync, and read receipt route contract.
For an SSE realtime backend, use `createLeeChatEventStream()` to create the `GET /api/chat/events` stream and publish events with `publish(event)`.

```ts
import { createInMemoryLeeChatBackend } from 'lee-chat-sdk/server'

const backend = createInMemoryLeeChatBackend()

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

```ts
type ChatMessagePart =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'image'
      url: string
      alt?: string
      width?: number
      height?: number
      mediaType?: string
    }
  | {
      type: 'file'
      url: string
      name: string
      size?: number
      mediaType?: string
    }

interface LeeChatRequest {
  appId: string
  conversation: {
    id: string
    kind: 'direct' | 'support' | 'assistant' | 'group'
  }
  participant: {
    id: string
    kind: 'user' | 'operator' | 'bot' | 'system'
    displayName?: string
    metadata?: Record<string, unknown>
  }
  visitor: {
    id: string
    metadata?: Record<string, unknown>
  }
  message: {
    id: string
    senderId: string
    content: string
    parts: ChatMessagePart[]
    createdAt: string
  }
  metadata?: Record<string, unknown>
  history: Array<{
    role: 'user' | 'assistant' | 'system' | 'agent'
    senderId: string
    content: string
    parts: ChatMessagePart[]
    createdAt: string
  }>
}
```

The response should match this shape.

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

A small Next.js route handler example:

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'

export async function POST(request: Request) {
  const body = (await request.json()) as LeeChatRequest
  const text = body.message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  const response: LeeChatResponse = {
    message: {
      content: `Received: ${text}`,
      metadata: {
        agentName: 'Mina',
      },
    },
  }

  return Response.json(response)
}
```

Response `parts` can include image and file attachments as well as text. The default React and Vanilla UI renders `image` parts as images and `file` parts as links.
The host app owns the actual file upload. Use `createChatMessagePartFromAttachment()` to convert an upload result into an SDK message part.

```ts
import { createChatMessagePartFromAttachment } from 'lee-chat-sdk'

const imagePart = createChatMessagePartFromAttachment({
  kind: 'image',
  url: uploadedImage.url,
  alt: uploadedImage.name,
  mediaType: uploadedImage.mediaType,
})
```

To use the default composer file picker, pass the host app upload function. React uses the `LeeChatWidget` prop, and Vanilla/script-tag uses the same contract through `initLeeChat()` config.

```tsx
<LeeChatWidget
  uploadAttachment={async (file) => {
    const uploadedFile = await uploadFileToStorage(file)

    return {
      kind: 'file',
      url: uploadedFile.url,
      name: file.name,
      mediaType: file.type,
      size: file.size,
    }
  }}
/>
```

```ts
initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  uploadAttachment: async (file) => {
    const uploadedFile = await uploadFileToStorage(file)

    return {
      kind: 'file',
      url: uploadedFile.url,
      name: file.name,
      mediaType: file.type,
      size: file.size,
    }
  },
})
```

## Server Sync Contract

`ConversationSyncClient` is a headless client for loading stored conversations, loading stored messages, and syncing read receipts. When the base `endpoint` is `/api/chat`, it uses these REST endpoints.

- `GET /api/chat/conversations?appId=...&visitorId=...&participantId=...&cursor=...&limit=...`
- `GET /api/chat/conversations/:conversationId/messages?cursor=...&limit=...`
- `PUT /api/chat/conversations/:conversationId/read`

```ts
import { ConversationSyncClient } from 'lee-chat-sdk'

const syncClient = new ConversationSyncClient({
  endpoint: '/api/chat',
  headers: () => ({
    Authorization: `Bearer ${authStore.accessToken}`,
  }),
  auth: {
    refresh: async () => {
      await authStore.refresh()
    },
  },
})

const conversations = await syncClient.listConversations({
  appId: 'commerce-web',
  visitorId: 'visitor-123',
})

const messages = await syncClient.listMessages({
  conversationId: conversations.conversations[0]?.id ?? '',
  limit: 30,
})

await syncClient.markMessageRead({
  conversationId: 'conversation-1',
  messageId: 'message-1',
  participantId: 'visitor-123',
})
```

`listConversations` expects `{ conversations, nextCursor }`, `listMessages` expects `{ messages, nextCursor }`, and `markMessageRead` expects `{ readReceipt }`. The model types are the SDK `ChatConversation`, `ChatMessage`, and `ChatReadReceipt`.

## Styling

The default UI exposes CSS custom properties and class hooks.
`theme.primaryColor` and `theme.radius` are applied to the `.lee-chat-root` widget root, not to the host page `:root`.
In the Vanilla/script-tag path, use `isolation: 'shadowDom'` for stronger separation from host CSS and DOM.

Import this subpath once from your app when using the default widget styles.

```ts
import 'lee-chat-sdk/style.css'
```

```css
:root {
  --lee-chat-primary: #111827;
  --lee-chat-background: #ffffff;
  --lee-chat-foreground: #111827;
  --lee-chat-muted: #f3f4f6;
  --lee-chat-border: #e5e7eb;
  --lee-chat-radius: 12px;
  --lee-chat-z-index: 60;
}

.lee-chat-trigger {
  box-shadow: 0 12px 28px rgb(15 23 42 / 18%);
}

.lee-chat-panel {
  width: min(420px, calc(100vw - 32px));
}
```

You can also pass additional class names through config.

```ts
initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  className: {
    root: 'my-chat-root',
    trigger: 'my-chat-trigger',
    panel: 'my-chat-panel',
    header: 'my-chat-header',
    messageList: 'my-chat-message-list',
    message: 'my-chat-message',
    messageStatus: 'my-chat-message-status',
    retryButton: 'my-chat-retry',
    assistantLoading: 'my-chat-assistant-loading',
    participantStatus: 'my-chat-participant-status',
    typingIndicator: 'my-chat-typing-indicator',
    readReceipt: 'my-chat-read-receipt',
    composer: 'my-chat-composer',
  },
})
```

React apps can replace the default message rendering when deeper customization is needed.

```tsx
<LeeChatWidget
  renderMessage={({ message, retryMessage }) => (
    <article data-status={message.status}>
      <p>
        {message.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('')}
      </p>
      {message.status === 'failed' ? (
        <button type="button" onClick={() => retryMessage(message.id)}>
          Retry
        </button>
      ) : null}
    </article>
  )}
  renderAssistantLoading={() => <p>Assistant is typing...</p>}
/>
```

React widgets can also replace the header, trigger, and composer footer through slots.

```tsx
<LeeChatWidget
  renderHeader={({ title, subtitle, close }) => (
    <header>
      <strong>{title}</strong>
      <span>{subtitle}</span>
      <button type="button" onClick={close}>
        Close
      </button>
    </header>
  )}
  renderTrigger={({ open, unreadCount }) => (
    <button type="button" onClick={open}>
      Contact us {unreadCount > 0 ? unreadCount : null}
    </button>
  )}
  renderComposerFooter={({ isSubmitting }) => (
    <small>{isSubmitting ? 'Sending' : 'Average reply time: 5 minutes'}</small>
  )}
/>
```

## React API

In React apps, compose the provider and widget.

```tsx
import {
  LeeChatProvider,
  LeeChatWidget,
  SseChatEventTransport,
} from 'lee-chat-sdk'

const eventTransport = new SseChatEventTransport({
  endpoint: '/api/support-chat/events',
})

export function SupportWidget() {
  return (
    <LeeChatProvider
      config={{
        appId: 'support',
        endpoint: '/api/support-chat',
        texts: {
          title: 'Support',
          subtitle: 'We usually reply in a few minutes.',
        },
      }}
      eventTransport={eventTransport}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
```

When using WebSocket, pass an adapter with reconnect/backoff options to the same `eventTransport` prop.

```ts
import { WebSocketChatEventTransport } from 'lee-chat-sdk'

const eventTransport = new WebSocketChatEventTransport({
  endpoint: 'wss://example.com/support-chat/events',
  reconnect: {
    enabled: true,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
})
```

Realtime transports do not inject arbitrary auth headers directly because browser `EventSource` and `WebSocket` APIs are constrained. Instead, pass `endpoint` as a function so every connection and reconnect can compute a fresh URL, and use `auth.refresh` to refresh tokens before reconnecting.

```ts
const eventTransport = new SseChatEventTransport({
  endpoint: () => `/api/support-chat/events?token=${authStore.accessToken}`,
  auth: {
    refresh: async () => {
      await authStore.refresh()
    },
  },
  reconnect: {
    enabled: true,
  },
})
```

Use `useLeeChat()` when you need direct access to open state and the controller.

```tsx
import { useLeeChat } from 'lee-chat-sdk'

export function CustomOpenButton() {
  const leeChat = useLeeChat()

  return (
    <button type="button" onClick={leeChat.open}>
      Open
    </button>
  )
}
```

## Vanilla JS API

For apps that do not write React code, import `initLeeChat()` from `lee-chat-sdk/vanilla`. This subpath is a DOM-based entry that does not import React.

```tsx
import {
  closeLeeChat,
  destroyLeeChat,
  initLeeChat,
  openLeeChat,
} from 'lee-chat-sdk/vanilla'
import { SseChatEventTransport } from 'lee-chat-sdk'

const eventTransport = new SseChatEventTransport({
  endpoint: '/api/chat/events',
})

const leeChat = initLeeChat({
  appId: 'landing-page',
  endpoint: '/api/chat',
  eventTransport,
  initialOpen: true,
})

leeChat.applyEvent({
  type: 'participant.typing_changed',
  typingIndicator: {
    conversationId: 'landing-page:conversation',
    participantId: 'landing-page-assistant',
    isTyping: true,
    updatedAt: new Date().toISOString(),
  },
})

openLeeChat()
closeLeeChat()
destroyLeeChat()
```

You can mount the widget into a specific container.

```ts
const container = document.querySelector('#chat-root')

if (container instanceof HTMLElement) {
  initLeeChat({
    appId: 'docs',
    endpoint: '/api/chat',
    container,
  })
}
```

The Vanilla API also supports renderer hooks that return DOM elements.

```ts
initLeeChat({
  appId: 'docs',
  endpoint: '/api/chat',
  renderTrigger: ({ open, unreadCount }) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = `Contact us ${unreadCount || ''}`
    button.addEventListener('click', open)
    return button
  },
  renderMessage: ({ message }) => {
    const article = document.createElement('article')
    article.textContent = `${message.role}: ${message.content}`
    return article
  },
})
```

## Headless API

Use the headless controller and primitives when you need deeper customization.

- `ConversationClient`: framework-agnostic core client for message sending, failure handling, retry, and persistence.
- `ConversationClient.applyEvent`: applies presence, typing, and read events from transports or realtime adapters to core state.
- `useChatController`: manages input state, submission state, messages, transport calls, and persistence.
- `useChatOperatorConsole`: React adapter for selected conversation state, summary lists, and assignment/close event creation in operator consoles.
- `ChatTransport`: adapter interface for HTTP, mock, WebSocket, SSE, or any custom transport.
- `HttpChatTransport`: default HTTP POST transport with `timeoutMs`, per-call `AbortSignal`, and 5xx/network retry policy support.
- `SseChatEventTransport`: browser `EventSource`-based SSE adapter. It parses server events as `ConversationClientEvent`, connects them to the React Provider or Vanilla widget, and provides reconnect/backoff options.
- `WebSocketChatEventTransport`: browser `WebSocket`-based realtime adapter. It parses server message payloads as `ConversationClientEvent`, connects them to the React Provider or Vanilla widget, and provides reconnect/backoff options.
- `MemoryChatPersistence`: in-memory conversation storage.
- `LocalStorageChatPersistence`: browser localStorage conversation storage.
- `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`: core participant-state models for presence, typing, and read state.
- `ChatComposer`, `ChatMessageList`, `ChatWidgetShell`, `FloatingChatTrigger`: composable UI primitives.

## Operator Console Model

Use `ChatEvent` for operational tooling and internal consoles. It can model message creation, failed messages, assignment changes, closed conversations, internal notes, and participant events as a single event stream.

```ts
import {
  assignChatOperatorConversation,
  buildChatConversationSummaries,
  buildChatOperatorConsoleState,
  buildChatEvent,
  closeChatOperatorConversation,
  collectChatEventsByConversationId,
  useChatOperatorConsole,
  type ChatEvent,
  type ChatConversation,
  type ChatMessage,
} from 'lee-chat-sdk'

const conversations: ChatConversation[] = []
const messages: ChatMessage[] = []
const events: ChatEvent[] = [
  buildChatEvent({
    id: 'event-1',
    conversationId: 'conversation-1',
    type: 'conversation.assigned',
    createdAt: '2026-06-01T00:00:00.000Z',
    payload: { agentName: 'Jin' },
  }),
]

const conversationEvents = collectChatEventsByConversationId({
  events,
  conversationId: 'conversation-1',
})
const conversationSummaries = buildChatConversationSummaries({
  conversations,
  messages,
  events,
  currentParticipantId: 'operator-1',
})
const operatorState = buildChatOperatorConsoleState({
  conversations,
  messages,
  events,
  selectedConversationId: 'conversation-1',
  currentParticipantId: 'operator-1',
})
const assignedState = assignChatOperatorConversation({
  state: operatorState,
  conversationId: 'conversation-1',
  agentName: 'Jin',
  eventId: 'event-2',
  createdAt: new Date().toISOString(),
})
const closedState = closeChatOperatorConversation({
  state: assignedState,
  conversationId: 'conversation-1',
  eventId: 'event-3',
  createdAt: new Date().toISOString(),
})

function OperatorConsolePanel() {
  const operatorConsole = useChatOperatorConsole({
    conversations,
    messages,
    initialEvents: events,
    initialSelectedConversationId: 'conversation-1',
    currentParticipantId: 'operator-1',
  })

  return operatorConsole.state.conversationSummaries.map((summary) => {
    return <button key={summary.id}>{summary.title}</button>
  })
}
```

For operator consoles backed by server storage and realtime events, start with `useSyncedChatOperatorConsole()`.

```tsx
import {
  ConversationSyncClient,
  SseChatEventTransport,
  useSyncedChatOperatorConsole,
} from 'lee-chat-sdk'

const syncClient = new ConversationSyncClient({
  endpoint: '/api/chat',
})
const eventTransport = new SseChatEventTransport({
  endpoint: '/api/chat/events',
})

function SyncedOperatorConsolePanel() {
  const operatorConsole = useSyncedChatOperatorConsole({
    syncClient,
    eventTransport,
    listConversationsParams: {
      appId: 'support',
    },
    currentParticipantId: 'operator-1',
  })

  if (operatorConsole.isLoading) {
    return <p>Loading conversations...</p>
  }

  return operatorConsole.state.conversationSummaries.map((summary) => {
    return <button key={summary.id}>{summary.title}</button>
  })
}
```

## Example Apps

```bash
pnpm --filter lee-chat-sdk-demo dev
pnpm --filter lee-chat-sdk-console dev
pnpm storybook
```

- `apps/demo`: drop-in chat widget example
- `apps/console`: operator console model example
- `apps/storybook`: Storybook for reviewing SDK UI states and install/integration guides

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:run
pnpm test:e2e
pnpm build
pnpm storybook:build
```

Run package-level checks:

```bash
pnpm --filter lee-chat-sdk test:run
pnpm --filter lee-chat-sdk-demo test:run
pnpm --filter lee-chat-sdk-console test:run
```

## npm Publishing Checklist

- Run `pnpm release:ready` to check package metadata, export paths, files, public publishConfig, and optional React peer dependencies.
- Run `pnpm test:e2e` to verify the script tag IIFE bundle, shadow DOM isolation, and endpoint submission in real Chromium.
- Run `pnpm release:smoke` to install the real tarball into a temporary consumer project and verify ESM, CJS, and TypeScript exports.
- Run `pnpm release:check` to execute readiness, typecheck, tests, build, npm pack dry-run, consumer smoke, and E2E.
- Confirm that both root `CHANGELOG.md` and `packages/sdk/CHANGELOG.md` include the current `packages/sdk` version.
- See [docs/release.md](./docs/release.md) for the full release flow.
- The GitHub Actions `Publish SDK` workflow defaults to dry-run and requires the `NPM_TOKEN` secret for actual publishing.
- CDN files are available from the `lee-chat-sdk-cdn-bundle` artifact in the `Publish SDK` workflow.
- Confirm that the package name is available on npm.
- Publish from `packages/sdk`.

```bash
pnpm release:ready
pnpm release:check
cd packages/sdk
pnpm publish --access public
```

`packages/sdk` defines `prepublishOnly`, so running `pnpm publish` directly runs the root `release:check` again.

## Current Limitations

- SSE/WebSocket provide endpoint-factory based auth refresh instead of direct arbitrary auth-header injection because of browser API constraints.
- Storybook interaction/play covers basic widget submission and operator conversation selection; more edge-case and visual regression coverage is still needed.
- The operator console app is for SDK demo and validation; production deployment still needs team permissions, routing policy, durable storage, and realtime backend integration.

## Roadmap

- Expand Storybook edge-case interactions and visual regression coverage.
- Add production operator console adapters, permissions, and routing policy.
