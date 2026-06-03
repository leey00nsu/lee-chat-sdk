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
import { initLeeChat } from 'lee-chat-sdk/vanilla'

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
  conversation: {
    kind: 'support',
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

## Backend Contract

The SDK sends the following request body to `endpoint`.

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

## Styling

The default UI exposes CSS custom properties and class hooks.

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
- `HttpChatTransport`: default HTTP POST transport.
- `SseChatEventTransport`: browser `EventSource`-based SSE adapter. It parses server events as `ConversationClientEvent` and connects them to the React Provider or Vanilla widget.
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

## Example Apps

```bash
pnpm --filter lee-chat-sdk-demo dev
pnpm --filter lee-chat-sdk-console dev
pnpm storybook
```

- `apps/demo`: drop-in chat widget example
- `apps/console`: operator console model example
- `apps/storybook`: Storybook for reviewing SDK UI states

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:run
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

- Confirm that `"private": true` has been removed from `packages/sdk/package.json`.
- Confirm `description`, `license`, `author`, `keywords`, and `publishConfig`.
- Confirm the `lee-chat-sdk/vanilla` subpath and optional React peer dependency policy.
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
- SSE reconnect/backoff, auth header refresh, and session refresh policies are not included yet.
- WebSocket auth header refresh and session refresh policies are not included yet.
- Advanced retry policies, timeout, and abort/cancel policies are not included yet.
- Storybook documentation is not included yet.
- Package export paths are currently limited to the root export.

## Roadmap

- Provide a no-React browser bundle.
- Add SSE reconnect/backoff policies.
- Add WebSocket auth header refresh and session refresh policies.
- Add operator-console UI adapters.
- Add timeout, abort/cancel, and advanced retry policies.
- Add Storybook examples.
- Prepare an npm release workflow.
