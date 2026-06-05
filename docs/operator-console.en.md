# Operator Console

Operator console APIs are experimental primitives. They are not a production-ready console; they are state models and hooks that host apps can reuse when building their own operator UI.

## What It Provides

- conversation/message/event based summaries
- selected conversation state
- assignment/close event creation
- hook that combines a server sync client with realtime event transport
- `apps/console` demo and Storybook examples

## What It Does Not Provide

- agent reply persistence API
- assignment/close mutation API
- internal note persistence API
- operator accounts/permissions
- queue/routing policy
- audit log
- production operator UI

## Headless Example

```ts
import {
  buildChatOperatorConsoleState,
  useChatOperatorConsole,
} from 'lee-chat-sdk'

const operatorConsole = useChatOperatorConsole({
  conversations,
  messages,
  initialEvents: events,
  currentParticipantId: 'operator-1',
})

operatorConsole.assignConversation('conversation-1', 'Mina')
operatorConsole.closeConversation('conversation-1')
```

## Synced Prototype

```tsx
import {
  ConversationSyncClient,
  SseChatEventTransport,
  useSyncedChatOperatorConsole,
} from 'lee-chat-sdk'

const operatorConsole = useSyncedChatOperatorConsole({
  syncClient: new ConversationSyncClient({
    endpoint: '/api/chat',
  }),
  eventTransport: new SseChatEventTransport({
    endpoint: '/api/chat/events',
  }),
  listConversationsParams: {
    appId: 'support',
  },
  currentParticipantId: 'operator-1',
})
```

`useSyncedChatOperatorConsole()` helps load conversations/messages and apply realtime events, but it does not provide production mutation APIs for persisting agent replies, assignment, or close actions.

