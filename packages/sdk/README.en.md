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
  participant: {
    id: 'participant-user-123',
    kind: 'user',
    displayName: 'Lee',
  },
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

The default UI includes `sending`, `failed`, retry, assistant loading, presence, typing, read receipt states, and text/image/file message part rendering. Customize copy through `config.texts`, class hooks through `config.className`, and replace key React UI slots with `LeeChatWidget` `renderMessage`, `renderAssistantLoading`, `renderHeader`, `renderTrigger`, and `renderComposerFooter`. In the Vanilla API, `initLeeChat()` `renderHeader`, `renderTrigger`, `renderMessage`, and `renderComposerFooter` act as DOM renderer hooks.

## Headless

`ConversationClient` handles message sending, failure handling, retry, and persistence without depending on React. Use `applyEvent` to apply presence, typing, and read events from realtime adapters, and use `ChatParticipantPresence`, `ChatTypingIndicator`, and `ChatReadReceipt` to model state by participant. `buildChatConversationSummaries` creates operator-console conversation-list summaries from conversations, messages, and event streams, while `buildChatOperatorConsoleState` and assign/close helpers mutate headless operator-console state. `SseChatEventTransport` and `WebSocketChatEventTransport` parse server events as `ConversationClientEvent` and connect them to the React Provider or Vanilla widget. `WebSocketChatEventTransport` also provides reconnect/backoff options.

## Backend Contract

The SDK sends `LeeChatRequest` to `endpoint` with POST and expects a `LeeChatResponse`.

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'
```

See the repository root README for full usage and development docs.
