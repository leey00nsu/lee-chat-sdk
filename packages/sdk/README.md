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
  participant: {
    id: 'participant-user-123',
    kind: 'user',
    displayName: 'Lee',
  },
})

leeChat.open()
```

`lee-chat-sdk/vanilla`는 React를 import하지 않는 DOM 기반 엔트리입니다.

## CSS

기본 위젯 CSS는 다음 subpath로 제공합니다.

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

기본 UI는 `sending`, `failed`, retry, assistant loading, presence, typing, read receipt 상태와 text/image/file message part 렌더링을 포함합니다. 문구는 `config.texts`, class hook은 `config.className`으로 조정할 수 있습니다. React에서는 `LeeChatWidget`의 `renderMessage`, `renderAssistantLoading`, `renderHeader`, `renderTrigger`, `renderComposerFooter`로 주요 UI slot을 교체할 수 있습니다. Vanilla API에서는 `initLeeChat()`의 `renderHeader`, `renderTrigger`, `renderMessage`, `renderComposerFooter`가 DOM renderer hook으로 동작합니다.

## Headless

`ConversationClient`는 React와 무관하게 메시지 전송, 실패 처리, retry, persistence 저장을 처리합니다. `HttpChatTransport`는 `timeoutMs`, 호출별 `AbortSignal`, 5xx/network retry 정책을 제어할 수 있습니다. `applyEvent`로 realtime adapter의 presence, typing, read event를 적용할 수 있고, `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`로 상태를 참여자 기준으로 표현할 수 있습니다. `buildChatConversationSummaries`는 conversation, message, event stream에서 운영 콘솔용 대화 목록 summary를 만들고, `buildChatOperatorConsoleState`와 assign/close helper는 headless 운영 콘솔 상태를 조작합니다. React에서는 `useChatOperatorConsole`로 선택 대화, summary 목록, 배정/종료 event 생성을 관리할 수 있습니다. `SseChatEventTransport`와 `WebSocketChatEventTransport`는 서버 event를 `ConversationClientEvent`로 파싱해 React Provider나 Vanilla widget에 연결합니다. `WebSocketChatEventTransport`는 reconnect/backoff 옵션도 제공합니다.

## Backend Contract

SDK는 `endpoint`로 `LeeChatRequest`를 POST 전송하고, `LeeChatResponse` 형태의 응답을 기대합니다.

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'
```

자세한 사용법과 개발 문서는 저장소 루트의 README를 확인하세요.
