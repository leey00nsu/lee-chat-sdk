# lee-chat-sdk

[한국어](./README.md) | English

A drop-in chat SDK for embedding chat experiences into websites. Use it with React, Vanilla JavaScript, or a script tag.

## Installation

```bash
pnpm add lee-chat-sdk
```

```bash
npm install lee-chat-sdk
```

Import the default widget styles once from your app entry.

```ts
import 'lee-chat-sdk/style.css'
```

## React

```tsx
import { LeeChatProvider, LeeChatWidget } from 'lee-chat-sdk'
import 'lee-chat-sdk/style.css'

export function App() {
  return (
    <LeeChatProvider
      config={{
        appId: 'my-service',
        endpoint: '/api/chat',
        initialMessage: 'How can I help?',
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
import 'lee-chat-sdk/style.css'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  initialMessage: 'How can I help?',
  isolation: 'shadowDom',
})

leeChat.open()
```

`lee-chat-sdk/vanilla` is a DOM-based entry that does not import React.

## Script Tag

For sites without a bundler, load the IIFE bundle directly. The bundle injects the default widget CSS.

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

The package build output is `dist/lee-chat.global.js`. The CDN upload SRI value is generated in `dist/lee-chat.global.manifest.json`.

## Backend

The SDK provides client-side UI and contracts. The host app backend owns durable message storage, auth/permissions, rate limits, tenant isolation, attachment storage, and realtime broadcast.

Production routes can be implemented by connecting a database storage adapter to `createLeeChatRouteHandler()` from `lee-chat-sdk/server`.

## Docs

See the repository root for full docs.

- Integration Guide: `docs/integration.en.md`
- Configuration: `docs/configuration.en.md`
- API Reference: `docs/api.en.md`
- Testing: `docs/testing.en.md`
- Backend Contract: `docs/backend-contract.md`
- Operator Console: `docs/operator-console.en.md`

Operator console APIs are experimental primitives. They are not a production-ready console; production usage still needs host-provided agent mutation APIs, permissions, routing policy, durable storage, and realtime backend integration.
