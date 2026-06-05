# Operator Console

운영자 콘솔 API는 experimental primitive입니다. 실제 production-ready 콘솔이 아니라, host app이 운영자 화면을 만들 때 재사용할 수 있는 상태 모델과 hook입니다.

## 제공하는 것

- conversation/message/event 기반 summary 생성
- 선택된 conversation 관리
- 배정/종료 event 생성
- server sync client와 realtime event transport를 연결하는 hook
- `apps/console` 데모와 Storybook 예제

## 제공하지 않는 것

- 상담원 답변 저장 API
- 상담 배정/종료 mutation API
- 내부 메모 저장 API
- 상담원 계정/권한
- queue/routing policy
- audit log
- production 운영자 UI

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

`useSyncedChatOperatorConsole()`은 conversation/message 조회와 realtime event 반영을 돕지만, 상담원 답변/배정/종료를 서버에 저장하는 production mutation API는 제공하지 않습니다.

