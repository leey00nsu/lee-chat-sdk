# API Reference

This document summarizes the main public APIs.

## React

- `LeeChatProvider`: provider that wires SDK config, transport, syncClient, and eventTransport.
- `LeeChatWidget`: default chat UI.
- `useLeeChat<TMessageMetadata>`: hook for open/close state and typed messages/controller access.
- `useChatController`: headless message controller.
- `renderAssistantContent`: slot that extends default assistant content.
- `renderMessageFooter`: slot that extends the bottom of the default bubble.
- `LEE_CHAT_TEXT_PRESETS`: built-in `ko` and `en` text presets.

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
- `isLeeChatRequest`: narrows an unknown request body to `LeeChatRequest`.
- `getLeeChatRequestText`, `getLeeChatRequestMetadata`: host backend input adapters.
- `collectLeeChatTextHistory`, `collectLeeChatTurnHistory`: converts history into text items or user/assistant turns.
- `createLeeChatTextResponse`: creates a typed `LeeChatResponse` from a host result.

## Testing

- `createMockLeeChatServer`: mock backend for tests and demos.
- `createMockLeeChatRequest`, `createMockLeeChatResponse`
- `createMockChatMessage`, `createMockLeeChatProviderConfig`

See [Testing](./testing.en.md) for examples.

## Models And Helpers

- `ChatMessage`, `ChatMessagePart`, `ChatConversation`, `ChatParticipant`
- `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`
- `createChatMessagePartFromAttachment`
- `buildChatConversationSummaries`
- `buildChatOperatorConsoleState`

Operator console APIs are experimental. See [Operator Console](./operator-console.en.md) for details.
