# API Reference

이 문서는 주요 public API의 역할을 요약합니다.

## React

- `LeeChatProvider`: SDK config, transport, syncClient, eventTransport를 연결하는 provider입니다.
- `LeeChatWidget`: 기본 채팅 UI입니다.
- `useLeeChat<TMessageMetadata>`: open/close 상태와 typed message/controller에 접근하는 hook입니다.
- `useChatController`: headless 메시지 controller입니다.
- `renderAssistantContent`: 기본 assistant content를 유지하며 구조화 내용을 확장하는 slot입니다.
- `renderMessageFooter`: 기본 말풍선 하단을 확장하는 slot입니다.
- `renderMessageStatus`: 개별 메시지 상태 UI를 `message`, `defaultContent`, `retryMessage`로 확장하거나 숨기는 slot입니다.
- `renderAssistantLoading`: 기본 assistant loading 버블 내부 콘텐츠를 교체하는 slot입니다.
- `LEE_CHAT_TEXT_PRESETS`: `ko`, `en` 기본 문구 preset입니다.

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
- `isLeeChatRequest`: unknown request body를 `LeeChatRequest`로 판별합니다.
- `getLeeChatRequestText`, `getLeeChatRequestMetadata`: host backend 입력 변환 helper입니다.
- `collectLeeChatTextHistory`, `collectLeeChatTurnHistory`: history를 text 또는 user/assistant turn으로 변환합니다.
- `createLeeChatTextResponse`: host 응답을 typed `LeeChatResponse`로 생성합니다.

## Testing

- `createMockLeeChatServer`: 테스트/데모용 mock backend입니다.
- `createMockLeeChatRequest`, `createMockLeeChatResponse`
- `createMockChatMessage`, `createMockLeeChatProviderConfig`

자세한 예제는 [Testing](./testing.md)을 참고하세요.

## Models And Helpers

- `ChatMessage`, `ChatMessagePart`, `ChatConversation`, `ChatParticipant`
- `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`
- `createChatMessagePartFromAttachment`
- `buildChatConversationSummaries`
- `buildChatOperatorConsoleState`

운영자 콘솔 API는 experimental입니다. 자세한 내용은 [Operator Console](./operator-console.md)을 참고하세요.
