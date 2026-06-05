# API Reference

이 문서는 주요 public API의 역할을 요약합니다.

## React

- `LeeChatProvider`: SDK config, transport, syncClient, eventTransport를 연결하는 provider입니다.
- `LeeChatWidget`: 기본 채팅 UI입니다.
- `useLeeChat`: open/close 상태와 controller에 접근하는 hook입니다.
- `useChatController`: headless 메시지 controller입니다.

```tsx
<LeeChatProvider config={{ appId: 'support', endpoint: '/api/chat' }}>
  <LeeChatWidget />
</LeeChatProvider>
```

## Vanilla

- `initLeeChat(config)`: DOM 기반 위젯을 mount합니다.
- `openLeeChat()`, `closeLeeChat()`, `destroyLeeChat()`: 전역 singleton instance를 제어합니다.

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

- `HttpChatTransport`: 기본 POST transport입니다.
- `SseChatEventTransport`: browser `EventSource` 기반 realtime adapter입니다.
- `WebSocketChatEventTransport`: browser `WebSocket` 기반 realtime adapter입니다.
- `ConversationSyncClient`: conversation/message 조회와 read receipt 동기화를 담당합니다.

## Server

- `createLeeChatRouteHandler`: production storage adapter를 연결하는 route helper입니다.
- `createInMemoryLeeChatBackend`: local development/reference backend입니다.
- `createLeeChatEventStream`: SSE stream과 `publish(event)`를 구성합니다.

## Testing

- `createMockLeeChatServer`: 테스트/데모용 mock backend입니다.

## Models And Helpers

- `ChatMessage`, `ChatMessagePart`, `ChatConversation`, `ChatParticipant`
- `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`
- `createChatMessagePartFromAttachment`
- `buildChatConversationSummaries`
- `buildChatOperatorConsoleState`

운영자 콘솔 API는 experimental입니다. 자세한 내용은 [Operator Console](./operator-console.md)을 참고하세요.

