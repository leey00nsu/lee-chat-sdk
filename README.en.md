# lee-chat-sdk

[한국어](./README.md) | English

`lee-chat-sdk` is a drop-in chat SDK for embedding chat experiences into websites. Use it as React components, a Vanilla JavaScript `initLeeChat()` call, or a script tag for sites without a bundler.

This project provides **chat UI and client/server contracts**. The host application backend owns durable message storage, auth/permissions, rate limits, tenant isolation, attachment storage, and realtime broadcast.

## Supported Embeds

- React: `LeeChatProvider`, `LeeChatWidget`
- Vanilla JS: `lee-chat-sdk/vanilla`
- Script tag: `dist/lee-chat.global.js`
- Server helpers: `lee-chat-sdk/server`
- Test helpers: `lee-chat-sdk/testing`

## Quick Start

```bash
pnpm add lee-chat-sdk
```

Import the default styles once.

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
import 'lee-chat-sdk/style.css'

const syncClient = new ConversationSyncClient({
  endpoint: '/api/chat',
})

export function App() {
  return (
    <LeeChatProvider
      config={{
        appId: 'my-service',
        endpoint: '/api/chat',
        initialMessage: 'How can I help?',
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
import 'lee-chat-sdk/style.css'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  initialMessage: 'How can I help?',
  isolation: 'shadowDom',
})

leeChat.open()
```

### Script Tag

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

## Default Behavior

- Renders a floating chat trigger and panel.
- Can show `initialMessage` as an assistant welcome message.
- Sends user messages to `endpoint` with POST.
- Renders text/image/file message parts.
- Sends attachments through the host-owned `uploadAttachment(file)` contract.
- Supports `memory` or `localStorage` persistence.
- Syncs server conversations/messages/read receipts with `ConversationSyncClient`.
- Applies `message.created`, presence, typing, and read events through SSE/WebSocket transports.
- Supports auth headers, auth refresh, request timeout, and retry through config.
- Renders typed structured metadata through content/footer slots while preserving default bubbles.
- Supports icons and spinners inside the default submit button through `renderSubmitContent`.
- Makes host integration intent explicit with `LEE_CHAT_TEXT_PRESETS`, `features`, and `resetKey`.

## Docs

- [Integration Guide](./docs/integration.en.md): React, Vanilla, script tag, attachments, realtime, styling
- [Configuration](./docs/configuration.en.md): `LeeChatConfig`, identity, auth, persistence
- [API Reference](./docs/api.en.md): public API summary
- [Testing](./docs/testing.en.md): host integration factories and mock server
- [Backend Contract](./docs/backend-contract.md): detailed server contract and Next.js examples
- [Operator Console](./docs/operator-console.en.md): experimental operator-console primitives
- [Release Guide](./docs/release.md): maintainer release flow

## Backend Summary

A production backend typically provides these endpoints.

- `POST /api/chat`
- `POST /api/chat/attachments`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId/messages`
- `PUT /api/chat/conversations/:conversationId/read`
- `GET /api/chat/events`

`lee-chat-sdk/server` provides `createLeeChatRouteHandler()` for production storage adapters, `createInMemoryLeeChatBackend()` for local reference routes, and `createLeeChatEventStream()` for SSE streams.

## Operator Console

Operator console APIs and `apps/console` are **experimental primitives/demos**. They are not a production-ready console. Production deployment still needs agent mutation APIs, permissions, routing policy, durable storage, and realtime backend integration.

## Example Apps

```bash
pnpm --filter lee-chat-sdk-demo dev
pnpm --filter lee-chat-sdk-console dev
pnpm storybook
```

- `apps/demo`: drop-in chat widget example
- `apps/console`: experimental operator-console primitive demo
- `apps/storybook`: Storybook for SDK UI states and integration guides

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:run
pnpm test:e2e
pnpm build
pnpm storybook:build
```

Release steps are documented in the [Release Guide](./docs/release.md).
