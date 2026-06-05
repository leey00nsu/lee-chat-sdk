# API Reference

This document summarizes the main public APIs.

## React

- `LeeChatProvider`: provider that wires SDK config, transport, syncClient, and eventTransport.
- `LeeChatWidget`: default chat UI.
- `useLeeChat`: hook for open/close state and controller access.
- `useChatController`: headless message controller.

```tsx
<LeeChatProvider config={{ appId: 'support', endpoint: '/api/chat' }}>
  <LeeChatWidget />
</LeeChatProvider>
```

## Vanilla

- `initLeeChat(config)`: mounts the DOM-based widget.
- `openLeeChat()`, `closeLeeChat()`, `destroyLeeChat()`: control the singleton instance.

```ts
import { initLeeChat } from 'lee-chat-sdk/vanilla'

const leeChat = initLeeChat({
  appId: 'landing',
  endpoint: '/api/chat',
})

leeChat.applyEvent({
  type: 'message.created',
  message,
})
```

## Transport

- `HttpChatTransport`: default POST transport.
- `SseChatEventTransport`: browser `EventSource` realtime adapter.
- `WebSocketChatEventTransport`: browser `WebSocket` realtime adapter.
- `ConversationSyncClient`: loads conversations/messages and syncs read receipts.

## Server

- `createLeeChatRouteHandler`: route helper for production storage adapters.
- `createInMemoryLeeChatBackend`: local development/reference backend.
- `createLeeChatEventStream`: creates an SSE stream and `publish(event)` API.

## Testing

- `createMockLeeChatServer`: mock backend for tests and demos.

## Models And Helpers

- `ChatMessage`, `ChatMessagePart`, `ChatConversation`, `ChatParticipant`
- `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`
- `createChatMessagePartFromAttachment`
- `buildChatConversationSummaries`
- `buildChatOperatorConsoleState`

Operator console APIs are experimental. See [Operator Console](./operator-console.en.md) for details.

