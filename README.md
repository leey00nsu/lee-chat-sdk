# lee-chat-sdk

한국어 | [English](./README.en.md)

`lee-chat-sdk`는 웹사이트에 채팅 경험을 빠르게 삽입하기 위한 drop-in chat SDK입니다. 기본 UI는 페이지 오른쪽 아래의 플로팅 버튼으로 시작하고, 버튼을 누르면 채팅 패널이 열립니다. 고객상담, AI assistant, 일반 대화, 그룹 대화로 확장 가능한 conversation 모델을 기반으로 하며 React 앱에서는 컴포넌트로, 일반 JavaScript 환경에서는 `initLeeChat()` 함수로 사용할 수 있습니다.

## 빠른 시작

위젯 기본 스타일을 사용하려면 앱 진입점에서 CSS를 한 번 import합니다.

```ts
import 'lee-chat-sdk/style.css'
```

### React

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

### Vanilla JS

```ts
import { initLeeChat } from 'lee-chat-sdk/vanilla'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
})

leeChat.open()
```

## 설치

npm 배포 후에는 다음처럼 설치합니다.

```bash
pnpm add lee-chat-sdk
```

또는:

```bash
npm install lee-chat-sdk
```

로컬 개발 중에는 sibling workspace에서 직접 연결할 수 있습니다.

```bash
pnpm add lee-chat-sdk@file:../lee-chat-sdk/packages/sdk
```

## 기본 동작

- 페이지 오른쪽 아래에 플로팅 채팅 버튼을 렌더링합니다.
- 버튼을 누르면 채팅 패널, 메시지 목록, 입력창, 전송 버튼이 표시됩니다.
- 사용자가 보낸 메시지를 `endpoint`로 POST 전송합니다.
- 응답 메시지를 assistant 메시지로 추가합니다.
- `memory` 또는 `localStorage` persistence를 선택할 수 있습니다.
- CSS custom properties와 class hook으로 스타일을 조정할 수 있습니다.

## 설정

```ts
import type { LeeChatConfig } from 'lee-chat-sdk'

const config: LeeChatConfig = {
  appId: 'commerce-web',
  endpoint: '/api/chat',
  conversation: {
    kind: 'support',
  },
  participant: {
    id: 'participant-user-123',
    kind: 'user',
    displayName: 'Lee',
    email: 'lee@example.com',
  },
  metadata: {
    plan: 'pro',
  },
  position: 'bottom-right',
  initialOpen: false,
  persistence: 'localStorage',
  texts: {
    title: '상담',
    subtitle: '궁금한 점을 남겨주세요.',
    triggerLabel: '상담 열기',
    placeholder: '메시지를 입력하세요',
    send: '보내기',
    sending: '전송 중',
    messageSending: '전송 중...',
    assistantLoading: '답변을 작성 중입니다...',
    error: '전송에 실패했습니다. 다시 시도해 주세요.',
    retry: '다시 보내기',
  },
  theme: {
    colorScheme: 'light',
    primaryColor: '#111827',
    radius: '12px',
  },
}
```

## Backend Contract

SDK는 `endpoint`로 다음 형태의 요청을 보냅니다.

```ts
interface LeeChatRequest {
  appId: string
  conversation: {
    id: string
    kind: 'direct' | 'support' | 'assistant' | 'group'
  }
  participant: {
    id: string
    kind: 'user' | 'operator' | 'bot' | 'system'
    displayName?: string
    metadata?: Record<string, unknown>
  }
  message: {
    id: string
    senderId: string
    content: string
    parts: Array<{
      type: 'text'
      text: string
    }>
    createdAt: string
  }
  metadata?: Record<string, unknown>
  history: Array<{
    role: 'user' | 'assistant' | 'system' | 'agent'
    senderId: string
    content: string
    parts: Array<{
      type: 'text'
      text: string
    }>
    createdAt: string
  }>
}
```

응답은 다음 형태를 기대합니다.

```ts
interface LeeChatResponse {
  message: {
    id?: string
    content: string
    parts?: Array<{
      type: 'text'
      text: string
    }>
    createdAt?: string
    metadata?: Record<string, unknown>
  }
}
```

간단한 Next.js route handler 예시:

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'

export async function POST(request: Request) {
  const body = (await request.json()) as LeeChatRequest
  const text = body.message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  const response: LeeChatResponse = {
    message: {
      content: `Received: ${text}`,
      metadata: {
        agentName: 'Mina',
      },
    },
  }

  return Response.json(response)
}
```

## Styling

기본 UI는 CSS custom properties와 class hook을 노출합니다.

위젯 기본 스타일을 사용하려면 다음 subpath를 앱에서 한 번 import합니다.

```ts
import 'lee-chat-sdk/style.css'
```

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

.lee-chat-trigger {
  box-shadow: 0 12px 28px rgb(15 23 42 / 18%);
}

.lee-chat-panel {
  width: min(420px, calc(100vw - 32px));
}
```

설정으로 class name을 추가할 수도 있습니다.

```ts
initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  className: {
    root: 'my-chat-root',
    trigger: 'my-chat-trigger',
    panel: 'my-chat-panel',
    header: 'my-chat-header',
    messageList: 'my-chat-message-list',
    message: 'my-chat-message',
    messageStatus: 'my-chat-message-status',
    retryButton: 'my-chat-retry',
    assistantLoading: 'my-chat-assistant-loading',
    composer: 'my-chat-composer',
  },
})
```

React에서는 기본 말풍선 렌더링을 더 깊게 바꿀 수 있습니다.

```tsx
<LeeChatWidget
  renderMessage={({ message, retryMessage }) => (
    <article data-status={message.status}>
      <p>{message.parts.map((part) => part.text).join('')}</p>
      {message.status === 'failed' ? (
        <button type="button" onClick={() => retryMessage(message.id)}>
          다시 보내기
        </button>
      ) : null}
    </article>
  )}
  renderAssistantLoading={() => <p>답변을 작성 중입니다...</p>}
/>
```

## React API

React 앱에서는 provider와 widget을 조합합니다.

```tsx
import { LeeChatProvider, LeeChatWidget } from 'lee-chat-sdk'

export function SupportWidget() {
  return (
    <LeeChatProvider
      config={{
        appId: 'support',
        endpoint: '/api/support-chat',
        texts: {
          title: 'Support',
          subtitle: 'We usually reply in a few minutes.',
        },
      }}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
```

`useLeeChat()`으로 열림 상태와 controller에 직접 접근할 수 있습니다.

```tsx
import { useLeeChat } from 'lee-chat-sdk'

export function CustomOpenButton() {
  const leeChat = useLeeChat()

  return (
    <button type="button" onClick={leeChat.open}>
      Open
    </button>
  )
}
```

## Vanilla JS API

React 코드를 작성하지 않는 앱에서는 `lee-chat-sdk/vanilla`에서 `initLeeChat()`을 가져옵니다. 이 subpath는 React를 import하지 않는 DOM 기반 엔트리입니다.

```ts
import {
  closeLeeChat,
  destroyLeeChat,
  initLeeChat,
  openLeeChat,
} from 'lee-chat-sdk/vanilla'

initLeeChat({
  appId: 'landing-page',
  endpoint: '/api/chat',
  initialOpen: true,
})

openLeeChat()
closeLeeChat()
destroyLeeChat()
```

특정 컨테이너에 마운트할 수도 있습니다.

```ts
const container = document.querySelector('#chat-root')

if (container instanceof HTMLElement) {
  initLeeChat({
    appId: 'docs',
    endpoint: '/api/chat',
    container,
  })
}
```

## Headless API

기본 UI보다 더 깊게 커스터마이징해야 한다면 headless controller와 primitive를 사용할 수 있습니다.

- `ConversationClient`: React와 무관하게 메시지 전송, 실패 처리, retry, persistence 저장을 처리하는 core client입니다.
- `useChatController`: 입력 상태, 제출 상태, 메시지 목록, transport 호출, persistence 저장을 관리합니다.
- `ChatTransport`: HTTP, mock, WebSocket, SSE 같은 전송 방식을 교체하기 위한 adapter interface입니다.
- `HttpChatTransport`: 기본 HTTP POST transport입니다.
- `MemoryChatPersistence`: 메모리 기반 대화 저장소입니다.
- `LocalStorageChatPersistence`: 브라우저 localStorage 기반 대화 저장소입니다.
- `ChatParticipantPresence`, `ChatTypingIndicator`, `ChatReadReceipt`: presence, typing, 읽음 상태를 참여자 기준으로 표현하는 core 모델입니다.
- `ChatComposer`, `ChatMessageList`, `ChatWidgetShell`, `FloatingChatTrigger`: 직접 조합 가능한 UI primitive입니다.

## Operator Console Model

운영 도구나 내부 콘솔에는 `ChatEvent` 모델을 사용할 수 있습니다. 메시지 생성, 실패, 배정 변경, 대화 종료, 내부 메모, 사용자 이벤트를 하나의 event stream으로 다룰 수 있습니다.

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
]

const conversationEvents = collectChatEventsByConversationId({
  events,
  conversationId: 'conversation-1',
})
```

## 예제 앱

```bash
pnpm --filter lee-chat-sdk-demo dev
pnpm --filter lee-chat-sdk-console dev
pnpm storybook
```

- `apps/demo`: drop-in chat widget 사용 예제
- `apps/console`: 운영 콘솔 모델 예제
- `apps/storybook`: SDK UI 상태 검수용 Storybook

## 개발

```bash
pnpm install
pnpm typecheck
pnpm test:run
pnpm build
pnpm storybook:build
```

패키지별 확인:

```bash
pnpm --filter lee-chat-sdk test:run
pnpm --filter lee-chat-sdk-demo test:run
pnpm --filter lee-chat-sdk-console test:run
```

## npm 배포 체크리스트

- `packages/sdk/package.json`에서 `"private": true` 제거 확인
- `description`, `license`, `author`, `keywords`, `publishConfig` 확인
- `lee-chat-sdk/vanilla` subpath와 React optional peer dependency 확인
- npm 패키지 이름 사용 가능 여부 확인
- `pnpm --filter lee-chat-sdk typecheck` 실행
- `pnpm --filter lee-chat-sdk test:run` 실행
- `pnpm --filter lee-chat-sdk build` 실행
- `packages/sdk`에서 publish

```bash
cd packages/sdk
pnpm publish --access public
```

## 현재 한계

- 현재 Vanilla JS API는 React 코드를 작성하지 않아도 되지만 내부 렌더러는 React 기반입니다.
- WebSocket/SSE transport adapter는 아직 포함되어 있지 않습니다.
- 고급 retry 정책, timeout, abort/cancel 정책은 아직 포함되어 있지 않습니다.
- Storybook 문서화는 아직 없습니다.
- package export path는 현재 root export로 제한되어 있습니다.

## Roadmap

- no-React browser bundle 제공
- WebSocket/SSE transport adapter 추가
- read receipt/typing/presence를 transport event와 widget UI에 연결
- conversation list와 operator-console controller API 추가
- timeout, abort/cancel, 고급 retry 정책 추가
- Storybook examples 추가
- npm release workflow 준비
