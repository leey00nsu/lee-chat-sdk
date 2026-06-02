# lee-chat-sdk

[한국어](./README.md) | English

A drop-in chat widget kit for adding customer support chat UI to websites. Use `LeeChatProvider` and `LeeChatWidget` in React apps, or call `initLeeChat()` from plain JavaScript.

## Installation

```bash
pnpm add lee-chat-sdk
```

```bash
npm install lee-chat-sdk
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
import { initLeeChat } from 'lee-chat-sdk'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
})

leeChat.open()
```

## CSS

The default widget CSS is included by the root import. If your bundler needs an explicit CSS import, use this subpath.

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

## Backend Contract

The SDK sends `LeeChatRequest` to `endpoint` with POST and expects a `LeeChatResponse`.

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'
```

See the repository root README for full usage and development docs.
