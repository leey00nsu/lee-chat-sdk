# lee-chat-sdk

한국어 | [English](./README.en.md)

`lee-chat-sdk`는 웹사이트에 채팅 경험을 빠르게 삽입하기 위한 drop-in chat SDK입니다. React 앱에서는 컴포넌트로, 일반 JavaScript 환경에서는 `initLeeChat()`으로, 번들러가 없는 사이트에서는 script tag로 붙일 수 있습니다.

이 프로젝트는 **채팅 UI와 client/server contract를 제공하는 SDK**입니다. 실제 메시지 저장 DB, 인증/권한, rate limit, tenant 분리, 첨부파일 저장소, realtime broadcast는 host application backend가 연결합니다.

## 지원 방식

- React: `LeeChatProvider`, `LeeChatWidget`
- Vanilla JS: `lee-chat-sdk/vanilla`
- Script tag: `dist/lee-chat.global.js`
- Server helpers: `lee-chat-sdk/server`
- Test helpers: `lee-chat-sdk/testing`

## 빠른 시작

```bash
pnpm add lee-chat-sdk
```

기본 스타일을 한 번 import합니다.

```ts
import 'lee-chat-sdk/style.css'
```

### React

```tsx
import {
  ConversationSyncClient,
  LeeChatProvider,
  LeeChatWidget,
} from 'lee-chat-sdk'
import 'lee-chat-sdk/style.css'

const syncClient = new ConversationSyncClient({
  endpoint: '/api/chat',
})

export function App() {
  return (
    <LeeChatProvider
      config={{
        appId: 'my-service',
        endpoint: '/api/chat',
        initialMessage: '무엇을 도와드릴까요?',
      }}
      syncClient={syncClient}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
```

### Vanilla JS

```ts
import { initLeeChat } from 'lee-chat-sdk/vanilla'
import 'lee-chat-sdk/style.css'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  initialMessage: '무엇을 도와드릴까요?',
  isolation: 'shadowDom',
})

leeChat.open()
```

### Script Tag

```html
<script src="https://cdn.example.com/lee-chat.global.js"></script>
<script>
  LeeChat.initLeeChat({
    appId: 'my-service',
    endpoint: '/api/chat',
    initialMessage: '무엇을 도와드릴까요?',
    isolation: 'shadowDom',
  })
</script>
```

## 기본 동작

- 플로팅 채팅 버튼과 패널을 렌더링합니다.
- `initialMessage`를 assistant welcome message로 표시할 수 있습니다.
- 사용자가 보낸 메시지를 `endpoint`로 POST 전송합니다.
- text/image/file message part를 렌더링합니다.
- host-owned `uploadAttachment(file)` contract로 첨부파일을 전송할 수 있습니다.
- `memory` 또는 `localStorage` persistence를 선택할 수 있습니다.
- `ConversationSyncClient`로 conversation/message/read receipt를 서버와 동기화할 수 있습니다.
- SSE/WebSocket transport로 `message.created`, presence, typing, read event를 반영할 수 있습니다.
- `requestHeaders`, `requestAuth`, `requestTimeoutMs`, `requestRetry`로 인증/timeout/retry를 설정할 수 있습니다.
- typed metadata와 content/footer slot으로 기본 말풍선을 유지한 구조화 응답을 렌더링할 수 있습니다.
- `renderSubmitContent`로 기본 전송 동작을 유지하며 아이콘이나 spinner를 넣을 수 있습니다.
- `LEE_CHAT_TEXT_PRESETS`, `features`, `resetKey`로 host 통합 의도를 명시할 수 있습니다.

## 문서

- [Integration Guide](./docs/integration.md): React, Vanilla, script tag, attachment, realtime, styling
- [Configuration](./docs/configuration.md): `LeeChatConfig`, identity, auth, persistence
- [API Reference](./docs/api.md): public API 요약
- [Testing](./docs/testing.md): host 통합 factory와 mock server
- [Backend Contract](./docs/backend-contract.ko.md): host backend가 구현해야 하는 endpoint 요약
- [Backend Contract EN](./docs/backend-contract.md): 상세 server contract와 Next.js 예제
- [Operator Console](./docs/operator-console.md): experimental 운영 콘솔 primitive
- [Release Guide](./docs/release.ko.md): maintainer 배포 절차

## Backend 요약

운영 backend는 보통 다음 endpoint를 제공합니다.

- `POST /api/chat`
- `POST /api/chat/attachments`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId/messages`
- `PUT /api/chat/conversations/:conversationId/read`
- `GET /api/chat/events`

`lee-chat-sdk/server`는 production storage adapter를 연결하는 `createLeeChatRouteHandler()`, local reference용 `createInMemoryLeeChatBackend()`, SSE stream helper인 `createLeeChatEventStream()`을 제공합니다.

## Operator Console

운영자 콘솔 API와 `apps/console`은 **experimental primitive/demo**입니다. production-ready 콘솔이 아니며, 운영 배포에는 상담원 mutation API, 권한, 라우팅 정책, 영구 저장소, realtime backend가 필요합니다.

## 예제 앱

```bash
pnpm --filter lee-chat-sdk-demo dev
pnpm --filter lee-chat-sdk-console dev
pnpm storybook
```

- `apps/demo`: drop-in chat widget 예제
- `apps/console`: experimental 운영 콘솔 primitive 데모
- `apps/storybook`: SDK UI 상태와 설치/연동 guide 검수용 Storybook

## 개발

```bash
pnpm install
pnpm typecheck
pnpm test:run
pnpm test:e2e
pnpm build
pnpm storybook:build
```

배포 절차는 [Release Guide](./docs/release.ko.md)에 있습니다.
