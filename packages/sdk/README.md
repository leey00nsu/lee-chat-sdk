# lee-chat-sdk

한국어 | [English](./README.en.md)

웹사이트에 채팅 경험을 삽입하기 위한 drop-in chat SDK입니다. 기본 floating widget을 제공하고, 고객상담, AI assistant, 일반 대화, 그룹 대화로 확장 가능한 conversation 모델을 사용합니다. React 앱에서는 `LeeChatProvider`와 `LeeChatWidget`을 사용하고, 일반 JavaScript 환경에서는 `initLeeChat()`을 호출합니다.

## 설치

```bash
pnpm add lee-chat-sdk
```

```bash
npm install lee-chat-sdk
```

기본 위젯 스타일을 사용하려면 앱 진입점에서 CSS를 한 번 import합니다.

```ts
import 'lee-chat-sdk/style.css'
```

## React

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

## Vanilla JS

```ts
import { initLeeChat } from 'lee-chat-sdk/vanilla'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  conversation: {
    kind: 'support',
  },
  visitor: {
    id: 'visitor-123',
  },
  participant: {
    id: 'participant-user-123',
    kind: 'user',
    displayName: 'Lee',
    email: 'lee@example.com',
  },
  initialMessage: '무엇을 도와드릴까요?',
  isolation: 'shadowDom',
})

leeChat.open()
```

`lee-chat-sdk/vanilla`는 React를 import하지 않는 DOM 기반 엔트리입니다.

## Script Tag

번들러가 없는 사이트에서는 IIFE 번들을 직접 로드할 수 있습니다. 이 번들은 기본 CSS를 스크립트 안에 포함합니다.

```html
<script src="https://cdn.example.com/lee-chat.global.js"></script>
<script>
  const leeChat = LeeChat.initLeeChat({
    appId: 'my-service',
    endpoint: '/api/chat',
    visitor: {
      id: 'visitor-123',
    },
    participant: {
      id: 'participant-user-123',
      kind: 'user',
      displayName: 'Lee',
      email: 'lee@example.com',
    },
    initialMessage: '무엇을 도와드릴까요?',
    isolation: 'shadowDom',
  })

  leeChat.open()
</script>
```

패키지 빌드 산출물 기준 파일 경로는 `dist/lee-chat.global.js`입니다. CDN 업로드용 SRI 값은 `dist/lee-chat.global.manifest.json`에 생성됩니다. npm subpath가 필요한 경우 `lee-chat-sdk/global`에서 같은 no-React API를 import할 수 있습니다.

## CSS

기본 위젯 CSS는 다음 subpath로 제공합니다.
`theme.primaryColor`와 `theme.radius`는 host page의 `:root`가 아니라 `.lee-chat-root` 위젯 root에만 적용됩니다. Vanilla/script tag 경로에서는 `isolation: 'shadowDom'`으로 host CSS와 위젯 DOM을 더 강하게 분리할 수 있습니다.

```ts
import 'lee-chat-sdk/style.css'
```

주요 CSS custom properties:

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
```

기본 UI는 `sending`, `failed`, retry, assistant loading, presence, typing, read receipt 상태와 text/image/file message part 렌더링을 포함합니다. `participant.id`를 직접 주지 않으면 SDK가 `visitor.id`를 localStorage에 생성/저장해 같은 브라우저 방문자를 재식별하고, 기본 `conversation.id`도 visitor 또는 participant 단위로 분리합니다. `initialMessage`는 저장된 대화가 없을 때 assistant welcome message로 표시되며 자동 POST 요청은 만들지 않습니다. `syncClient`를 넘기면 위젯을 열 때 마지막 unread 메시지를 read receipt로 동기화합니다. `requestHeaders`, `requestAuth`, `requestTimeoutMs`, `requestRetry`로 기본 요청의 인증 헤더, 인증 갱신, timeout, retry를 설정할 수 있습니다. 문구는 `config.texts`, class hook은 `config.className`으로 조정할 수 있습니다. React에서는 `LeeChatWidget`의 `uploadAttachment`, `renderMessage`, `renderAssistantLoading`, `renderHeader`, `renderTrigger`, `renderComposerFooter`로 기본 업로드와 주요 UI slot을 교체할 수 있습니다. Vanilla API에서는 `initLeeChat()`의 `uploadAttachment`, `renderHeader`, `renderTrigger`, `renderMessage`, `renderComposerFooter`가 DOM renderer hook으로 동작합니다.

## Headless

`ConversationClient`는 React와 무관하게 메시지 전송, 실패 처리, retry, persistence 저장을 처리합니다. `ConversationSyncClient`는 서버에 저장된 conversation, message, read receipt를 조회/동기화합니다. `HttpChatTransport`는 동적 headers, auth refresh, `timeoutMs`, 호출별 `AbortSignal`, 5xx/network retry 정책을 제어할 수 있습니다. `applyEvent`로 realtime adapter의 presence, typing, read event를 적용할 수 있고, `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`로 상태를 참여자 기준으로 표현할 수 있습니다. `buildChatConversationSummaries`, `buildChatOperatorConsoleState`, `useChatOperatorConsole`, `useSyncedChatOperatorConsole`는 experimental 운영 콘솔 primitive입니다. production-ready 콘솔은 아니며, 실제 운영에는 host app의 상담원 mutation API, 권한, 라우팅 정책, 영구 저장소, realtime backend가 필요합니다. `SseChatEventTransport`와 `WebSocketChatEventTransport`는 서버 event를 `ConversationClientEvent`로 파싱해 React Provider나 Vanilla widget에 연결하고, 동적 endpoint, auth refresh, reconnect/backoff 옵션을 제공합니다.

파일 업로드 자체는 host app이 수행합니다. 기본 composer에 `uploadAttachment(file)`을 넘기면 SDK가 업로드 결과를 `image` 또는 `file` message part로 전송합니다. Headless 경로에서는 `createChatMessagePartFromAttachment()`로 직접 변환할 수 있습니다.

## Backend Contract

SDK는 `endpoint`로 `LeeChatRequest`를 POST 전송하고, `LeeChatResponse` 형태의 응답을 기대합니다.
로컬 개발과 contract 검증용 route handler가 필요하면 `lee-chat-sdk/server`의 `createInMemoryLeeChatBackend()`를 사용할 수 있습니다. 이 구현은 메모리에 저장하므로 운영 DB 대체용은 아닙니다.
운영 route에서는 같은 subpath의 `createLeeChatRouteHandler()`에 DB storage adapter를 연결해 message 저장, conversation sync, read receipt route contract를 재사용할 수 있습니다.
SSE realtime backend는 `createLeeChatEventStream()`으로 stream response와 event publish를 구성할 수 있습니다.

```ts
import { createInMemoryLeeChatBackend } from 'lee-chat-sdk/server'

const backend = createInMemoryLeeChatBackend()

export function POST(request: Request) {
  return backend.handleRequest(request)
}

export function GET(request: Request) {
  return backend.handleRequest(request)
}

export function PUT(request: Request) {
  return backend.handleRequest(request)
}
```

자세한 사용법과 개발 문서는 저장소 루트의 README를 확인하세요.
