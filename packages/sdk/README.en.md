# lee-chat-sdk

[한국어](./README.md) | English

A drop-in chat SDK for embedding chat experiences into websites. It provides a default floating widget and uses a conversation model that can support customer support, AI assistants, direct conversations, and group-ready chat. Use `LeeChatProvider` and `LeeChatWidget` in React apps, or call `initLeeChat()` from plain JavaScript.

## Installation

```bash
pnpm add lee-chat-sdk
```

```bash
npm install lee-chat-sdk
```

Import the CSS once from your app entry when using the default widget styles.

```ts
import 'lee-chat-sdk/style.css'
```

## React

```tsx
import { LeeChatProvider, LeeChatWidget } from 'lee-chat-sdk'

export function App() {
  return (
    <LeeChatProvider
      config={{
        appId: 'my-service',
        endpoint: '/api/chat',
      }}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
```

## Vanilla JS

```ts
import { initLeeChat } from 'lee-chat-sdk/vanilla'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  conversation: {
    kind: 'support',
  },
  visitor: {
    id: 'visitor-123',
  },
  participant: {
    id: 'participant-user-123',
    kind: 'user',
    displayName: 'Lee',
    email: 'lee@example.com',
  },
  initialMessage: 'How can I help?',
  isolation: 'shadowDom',
})

leeChat.open()
```

`lee-chat-sdk/vanilla` is a DOM-based entry that does not import React.

## Script Tag

For sites without a bundler, load the IIFE bundle and use the global `LeeChat` API. The IIFE bundle injects the default widget CSS.

```html
<script src="https://cdn.example.com/lee-chat.global.js"></script>
<script>
  const leeChat = LeeChat.initLeeChat({
    appId: 'my-service',
    endpoint: '/api/chat',
    visitor: {
      id: 'visitor-123',
    },
    participant: {
      id: 'participant-user-123',
      kind: 'user',
      displayName: 'Lee',
      email: 'lee@example.com',
    },
    initialMessage: 'How can I help?',
    isolation: 'shadowDom',
  })

  leeChat.open()
</script>
```

The package build output is `dist/lee-chat.global.js`. The CDN upload SRI value is generated in `dist/lee-chat.global.manifest.json`. If you need an npm subpath with the same no-React API, import from `lee-chat-sdk/global`.

## CSS

The default widget CSS is available through this subpath.
`theme.primaryColor` and `theme.radius` are applied to the `.lee-chat-root` widget root, not to the host page `:root`. In the Vanilla/script-tag path, use `isolation: 'shadowDom'` for stronger separation from host CSS and DOM.

```ts
import 'lee-chat-sdk/style.css'
```

Main CSS custom properties:

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
```

The default UI includes `sending`, `failed`, retry, assistant loading, presence, typing, read receipt states, and text/image/file message part rendering. When `participant.id` is not provided, the SDK creates and stores `visitor.id` in localStorage so the same browser visitor can be identified again, and the default `conversation.id` is derived per visitor or participant. `initialMessage` is shown as an assistant welcome message when there is no stored conversation, and it does not create an automatic POST request. If `syncClient` is provided, opening the widget syncs the latest unread message as a read receipt. Configure default auth headers, auth refresh, request timeout, and retry behavior with `requestHeaders`, `requestAuth`, `requestTimeoutMs`, and `requestRetry`. Customize copy through `config.texts`, class hooks through `config.className`, and replace default upload plus key React UI slots with `LeeChatWidget` `uploadAttachment`, `renderMessage`, `renderAssistantLoading`, `renderHeader`, `renderTrigger`, and `renderComposerFooter`. In the Vanilla API, `initLeeChat()` `uploadAttachment`, `renderHeader`, `renderTrigger`, `renderMessage`, and `renderComposerFooter` act as DOM hooks.

## Headless

`ConversationClient` handles message sending, failure handling, retry, and persistence without depending on React. `ConversationSyncClient` loads and syncs server-stored conversations, messages, and read receipts. `HttpChatTransport` supports dynamic headers, auth refresh, `timeoutMs`, per-call `AbortSignal`, and 5xx/network retry policies. Use `applyEvent` to apply presence, typing, and read events from realtime adapters, and use `ChatParticipantPresence`, `ChatTypingIndicator`, and `ChatReadReceipt` to model state by participant. `buildChatConversationSummaries` creates operator-console conversation-list summaries from conversations, messages, and event streams, while `buildChatOperatorConsoleState` and assign/close helpers mutate headless operator-console state. In React, `useChatOperatorConsole` manages selected conversations, summary lists, and assignment/close event creation, while `useSyncedChatOperatorConsole` connects `ConversationSyncClient` with realtime event transports. `SseChatEventTransport` and `WebSocketChatEventTransport` parse server events as `ConversationClientEvent`, connect them to the React Provider or Vanilla widget, and provide dynamic endpoint, auth refresh, and reconnect/backoff options.

The host app owns the actual file upload. Pass `uploadAttachment(file)` to the default composer to send the upload result as an `image` or `file` message part. In headless flows, use `createChatMessagePartFromAttachment()` to convert the upload result directly.

## Backend Contract

The SDK sends `LeeChatRequest` to `endpoint` with POST and expects a `LeeChatResponse`.
For local development and contract validation routes, use `createInMemoryLeeChatBackend()` from `lee-chat-sdk/server`. It stores data in memory, so replace it with durable storage for production.
For production routes, connect your database storage adapter to `createLeeChatRouteHandler()` from the same subpath to reuse the message storage, conversation sync, and read receipt route contract.
For an SSE realtime backend, use `createLeeChatEventStream()` to create stream responses and publish events.

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

See the repository root README for full usage and development docs.
