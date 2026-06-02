# lee-chat-sdk

[한국어](./README.md) | English

Reusable React primitives for building domain-specific chat widgets, message flows, and operator consoles.

`lee-chat-sdk` is not a chatbot service and does not assume a specific backend. It provides the reusable client-side pieces that most chat products need: message models, transport adapters, persistence adapters, a controller hook, lightweight UI primitives, and event models for operational tooling.

## What You Can Build

- A floating support chat widget
- A domain-specific AI assistant UI
- A chat interface backed by HTTP, mock, WebSocket, or SSE transport
- A persisted conversation experience using memory or localStorage
- A message renderer with custom metadata such as citations, agent names, order IDs, or internal notes
- An operator console with conversation assignment, internal notes, customer events, and message/event streams

## Status

This package is in early development.

- Public API is still evolving.
- UI primitives are intentionally minimal.
- The package is designed for npm publishing, but should be treated as experimental until a stable `1.0.0` release.

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

## Peer Dependencies

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

## Package Contents

```text
packages/sdk
  src/controller       useChatController
  src/model            ChatMessage, ChatEvent
  src/persistence      MemoryChatPersistence, LocalStorageChatPersistence
  src/transport        ChatTransport, HttpChatTransport
  src/ui               ChatComposer, ChatMessageList, ChatWidgetShell, FloatingChatTrigger

apps/demo              support chat widget example
apps/console           operator console example
```

## Core Concepts

### Messages

`ChatMessage` is the base message type. It supports generic metadata so each product can attach its own domain-specific context.

```ts
import type { ChatMessage } from 'lee-chat-sdk'

interface SupportMetadata {
  agentName?: string
  orderId?: string
  assignmentStatus?: 'unassigned' | 'assigned' | 'closed'
}

const message: ChatMessage<SupportMetadata> = {
  id: 'message-1',
  conversationId: 'conversation-1',
  role: 'agent',
  content: 'I can help with that order.',
  status: 'sent',
  createdAt: new Date().toISOString(),
  metadata: {
    agentName: 'Mina',
    orderId: 'order-123',
    assignmentStatus: 'assigned',
  },
}
```

### Transport

`ChatTransport` lets you swap how messages are sent. The SDK does not care whether you use HTTP, mocks, WebSocket, SSE, or a custom backend.

```ts
import type { ChatTransport } from 'lee-chat-sdk'

interface SendMessageRequest {
  content: string
  conversationId: string
}

interface SendMessageResponse {
  content: string
}

const mockTransport: ChatTransport<
  SendMessageRequest,
  SendMessageResponse
> = {
  async sendMessage(request) {
    return {
      content: `Received: ${request.content}`,
    }
  },
}
```

The package also includes an HTTP transport:

```ts
import { HttpChatTransport } from 'lee-chat-sdk'

const transport = new HttpChatTransport<
  SendMessageRequest,
  SendMessageResponse
>({
  endpoint: '/api/chat',
})
```

### Persistence

Use memory persistence for demos or temporary sessions:

```ts
import { MemoryChatPersistence, type ChatMessage } from 'lee-chat-sdk'

const persistence = new MemoryChatPersistence<ChatMessage>()
```

Use localStorage persistence for browser-side conversation history:

```ts
import { LocalStorageChatPersistence, type ChatMessage } from 'lee-chat-sdk'

const persistence = new LocalStorageChatPersistence<ChatMessage>({
  storageKey: 'support-chat:conversation-1',
  storageVersion: 1,
  validateMessages(messages) {
    return Array.isArray(messages) ? (messages as ChatMessage[]) : []
  },
})
```

### Controller

`useChatController` manages input state, submission state, user messages, assistant messages, failed messages, transport calls, and persistence.

```tsx
'use client'

import {
  ChatComposer,
  ChatMessageList,
  ChatWidgetShell,
  MemoryChatPersistence,
  useChatController,
  type ChatMessage,
} from 'lee-chat-sdk'

interface SupportMetadata {
  agentName?: string
  assignmentStatus?: 'unassigned' | 'assigned' | 'closed'
}

interface SupportRequest {
  content: string
  conversationId: string
}

interface SupportResponse {
  content: string
  metadata: SupportMetadata
}

const persistence = new MemoryChatPersistence<ChatMessage<SupportMetadata>>()

export function SupportChatWidget() {
  const chat = useChatController<
    SupportRequest,
    SupportResponse,
    SupportMetadata
  >({
    conversationId: 'support-conversation',
    persistence,
    transport: {
      async sendMessage(request) {
        return {
          content: `Agent received: ${request.content}`,
          metadata: {
            agentName: 'Mina',
            assignmentStatus: 'assigned',
          },
        }
      },
    },
    buildRequest: ({ content, conversationId }) => ({
      content,
      conversationId,
    }),
    buildAssistantMessage: ({ response }) => ({
      content: response.content,
      metadata: response.metadata,
    }),
  })

  return (
    <ChatWidgetShell
      title="Support Chat"
      description="Ask a support question."
      footer={
        <ChatComposer
          inputId="support-message"
          label="Message"
          value={chat.inputValue}
          placeholder="Type your message"
          submitLabel={chat.isSubmitting ? 'Sending' : 'Send'}
          isLoading={chat.isSubmitting}
          onChange={chat.setInputValue}
          onSubmit={() => {
            void chat.submitMessage()
          }}
        />
      }
    >
      <ChatMessageList
        messages={chat.messages}
        renderMessage={(message) => (
          <article>
            <strong>{message.role}</strong>
            <p>{message.content}</p>
            {message.metadata?.agentName ? (
              <small>{message.metadata.agentName}</small>
            ) : null}
          </article>
        )}
      />
    </ChatWidgetShell>
  )
}
```

### Events

`ChatEvent` is useful when building operator consoles or audit trails. It can represent messages, failed messages, assignment changes, closed conversations, internal notes, and customer events.

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
  buildChatEvent({
    id: 'event-2',
    conversationId: 'conversation-1',
    type: 'internal_note.created',
    createdAt: '2026-06-01T00:01:00.000Z',
    payload: { content: 'Customer may churn.' },
  }),
]

const conversationEvents = collectChatEventsByConversationId({
  events,
  conversationId: 'conversation-1',
})
```

## UI Primitives

The included UI components are deliberately small and unopinionated:

- `ChatWidgetShell`: panel layout with title, description, content, and footer slots
- `ChatMessageList`: message list with a `renderMessage` slot
- `ChatComposer`: controlled textarea and submit form
- `FloatingChatTrigger`: accessible open/close trigger button

You can use these directly or replace them with your own design system components while keeping the SDK controller, transport, persistence, and model layer.

## Example Apps

### Support Chat Demo

```bash
pnpm --filter lee-chat-sdk-demo dev
```

Demonstrates:

- A support chat widget
- `useChatController`
- mock transport
- memory persistence
- custom support metadata

### Operator Console

```bash
pnpm --filter lee-chat-sdk-console dev
```

Demonstrates:

- Conversation list
- Message thread
- Customer context panel
- unread count
- assigned / unassigned / closed states
- assignment action
- internal notes
- customer event timeline
- `ChatEvent` stream collection

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

## Publishing Checklist

Before publishing to npm:

- Remove `"private": true` from `packages/sdk/package.json`.
- Confirm the package name is available on npm.
- Add package metadata: `description`, `license`, `author`, `repository`, `keywords`.
- Decide whether the published package should include only `dist` or additional docs.
- Run `pnpm --filter lee-chat-sdk build`.
- Run `pnpm --filter lee-chat-sdk test:run`.
- Run `pnpm --filter lee-chat-sdk typecheck`.
- Publish from `packages/sdk`.

```bash
cd packages/sdk
pnpm publish --access public
```

## Current Limitations

- UI primitives are not styled for production.
- WebSocket and SSE transports are not implemented yet.
- There is no conversation-list controller yet.
- Retry and resend policies are not included yet.
- Storybook documentation is not included yet.
- Package export paths are currently limited to the root export.

## Roadmap

- Split headless logic and styled UI packages.
- Add WebSocket and SSE transport adapters.
- Add conversation list and operator-console controller APIs.
- Add retry, resend, and optimistic update policies.
- Add Storybook examples.
- Prepare stable npm publishing metadata and release workflow.
