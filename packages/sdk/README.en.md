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
})

leeChat.open()
```

`lee-chat-sdk/vanilla` is a DOM-based entry that does not import React.

## CSS

The default widget CSS is available through this subpath.

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

The default UI includes `sending`, `failed`, retry, and assistant loading states. Customize copy through `config.texts`, class hooks through `config.className`, and replace message rendering in React with `LeeChatWidget` `renderMessage` and `renderAssistantLoading`.

## Backend Contract

The SDK sends `LeeChatRequest` to `endpoint` with POST and expects a `LeeChatResponse`.

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'
```

See the repository root README for full usage and development docs.
