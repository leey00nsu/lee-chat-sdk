# lee-chat-sdk

[한국어](./README.md) | English

`lee-chat-sdk` is a drop-in chat widget kit for adding customer support chat UI to a website. The default UI starts as a floating button in the bottom-right corner and opens a chat panel when clicked. Use it as React components in React apps, or call `initLeeChat()` from plain JavaScript.

## Quick Start

### React

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

### Vanilla JS

```ts
import { initLeeChat } from 'lee-chat-sdk'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
})

leeChat.open()
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
- Sends user messages to `endpoint` with POST.
- Adds the response as an assistant message.
- Supports `memory` or `localStorage` persistence.
- Exposes CSS custom properties and class hooks for styling.

## Configuration

```ts
import type { LeeChatConfig } from 'lee-chat-sdk'

const config: LeeChatConfig = {
  appId: 'commerce-web',
  endpoint: '/api/chat',
  user: {
    id: 'user-123',
    name: 'Lee',
    email: 'lee@example.com',
  },
  metadata: {
    plan: 'pro',
  },
  position: 'bottom-right',
  initialOpen: false,
  persistence: 'localStorage',
  texts: {
    title: 'Support',
    subtitle: 'Leave your question.',
    triggerLabel: 'Open support',
    placeholder: 'Type your message',
    send: 'Send',
    sending: 'Sending',
    error: 'Message failed. Please try again.',
  },
  theme: {
    colorScheme: 'light',
    primaryColor: '#111827',
    radius: '12px',
  },
}
```

## Backend Contract

The SDK sends the following request body to `endpoint`.

```ts
interface LeeChatRequest {
  appId: string
  conversationId: string
  message: {
    id: string
    content: string
    createdAt: string
  }
  user?: {
    id: string
    name?: string
    email?: string
  }
  metadata?: Record<string, unknown>
  history: Array<{
    role: 'user' | 'assistant' | 'system' | 'agent'
    content: string
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

  const response: LeeChatResponse = {
    message: {
      content: `Received: ${body.message.content}`,
      metadata: {
        agentName: 'Mina',
      },
    },
  }

  return Response.json(response)
}
```

## Styling

The default UI exposes CSS custom properties and class hooks.

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
    composer: 'my-chat-composer',
  },
})
```

## React API

In React apps, compose the provider and widget.

```tsx
import { LeeChatProvider, LeeChatWidget } from 'lee-chat-sdk'

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
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
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

For apps that do not write React code, call `initLeeChat()`.

```ts
import { closeLeeChat, destroyLeeChat, initLeeChat, openLeeChat } from 'lee-chat-sdk'

initLeeChat({
  appId: 'landing-page',
  endpoint: '/api/chat',
  initialOpen: true,
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

## Headless API

Use the headless controller and primitives when you need deeper customization.

- `useChatController`: manages input state, submission state, messages, transport calls, and persistence.
- `ChatTransport`: adapter interface for HTTP, mock, WebSocket, SSE, or any custom transport.
- `HttpChatTransport`: default HTTP POST transport.
- `MemoryChatPersistence`: in-memory conversation storage.
- `LocalStorageChatPersistence`: browser localStorage conversation storage.
- `ChatComposer`, `ChatMessageList`, `ChatWidgetShell`, `FloatingChatTrigger`: composable UI primitives.

## Operator Console Model

Use `ChatEvent` for operational tooling and internal consoles. It can model message creation, failed messages, assignment changes, closed conversations, internal notes, and customer events as a single event stream.

```ts
import {
  buildChatEvent,
  collectChatEventsByConversationId,
  type ChatEvent,
} from 'lee-chat-sdk'

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
```

## Example Apps

```bash
pnpm --filter lee-chat-sdk-demo dev
pnpm --filter lee-chat-sdk-console dev
```

- `apps/demo`: drop-in chat widget example
- `apps/console`: operator console model example

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:run
pnpm build
```

Run package-level checks:

```bash
pnpm --filter lee-chat-sdk test:run
pnpm --filter lee-chat-sdk-demo test:run
pnpm --filter lee-chat-sdk-console test:run
```

## npm Publishing Checklist

- Remove `"private": true` from `packages/sdk/package.json`.
- Add `description`, `license`, `author`, `repository`, and `keywords`.
- Decide the React-only peer dependency policy and Vanilla JS bundle policy.
- Confirm that the package name is available on npm.
- Run `pnpm --filter lee-chat-sdk typecheck`.
- Run `pnpm --filter lee-chat-sdk test:run`.
- Run `pnpm --filter lee-chat-sdk build`.
- Publish from `packages/sdk`.

```bash
cd packages/sdk
pnpm publish --access public
```

## Current Limitations

- The current Vanilla JS API does not require writing React code, but its internal renderer is React-based.
- WebSocket and SSE transport adapters are not included yet.
- Retry and resend policies are not included yet.
- Storybook documentation is not included yet.
- Package export paths are currently limited to the root export.

## Roadmap

- Provide a no-React browser bundle.
- Add WebSocket and SSE transport adapters.
- Add conversation list and operator-console controller APIs.
- Add retry, resend, and optimistic update policies.
- Add Storybook examples.
- Prepare an npm release workflow.
