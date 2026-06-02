# lee-chat-sdk

React 기반 채팅 위젯과 운영 콘솔을 만들기 위한 실험적 SDK입니다.

이 프로젝트는 `leey00nsu-next-blog-v2`의 블로그 Q&A 챗봇에서 출발해, 여러 도메인의 채팅 위젯과 운영 콘솔을 같은 메시지 모델 위에서 구성하기 위한 SDK로 분리합니다.

## 무엇을 할 수 있나

`lee-chat-sdk`는 특정 챗봇 서비스가 아니라, 도메인별 채팅 경험을 만들 때 반복되는 구조를 제공합니다.

- 블로그 Q&A 챗봇처럼 HTTP API에 질문을 보내고 답변을 렌더링할 수 있습니다.
- 고객상담형 floating chat widget을 만들 수 있습니다.
- 메시지마다 citation, 상담자 이름, 내부 메모 여부 같은 도메인 metadata를 붙일 수 있습니다.
- localStorage, memory, HTTP transport를 교체하면서 같은 controller를 재사용할 수 있습니다.
- 운영 콘솔에서 대화 목록, 메시지 스레드, 고객 이벤트, 내부 메모, 배정 상태를 같은 메시지/event 모델로 다룰 수 있습니다.

## 왜 만들었나

처음 구현은 블로그 안의 `BlogChatWidget`이었습니다. 이 위젯에는 다음 책임이 섞여 있었습니다.

- 질문 입력 상태
- pending/sent/failed 메시지 상태
- `/api/chat` 호출
- localStorage 저장
- 자동 스크롤과 floating panel UI
- RAG citation/refusal/follow-up 렌더링

`lee-chat-sdk`는 이 중 재사용 가능한 부분을 분리합니다.

- SDK가 담당: 메시지 모델, controller, transport, persistence, UI primitive, event stream
- 소비자가 담당: 도메인 API, metadata 해석, 메시지 렌더링, 비즈니스 정책

블로그 프로젝트는 현재 `lee-chat-sdk`를 첫 번째 실제 소비자로 사용합니다.

## Workspace

- `packages/sdk`: 메시지 모델, transport, persistence, controller, UI primitives
- `apps/demo`: 고객상담형 채팅 데모
- `apps/console`: 내부 운영 콘솔

## 패키지 구조

```text
packages/sdk
  src/controller       # useChatController
  src/model            # ChatMessage, ChatEvent
  src/persistence      # MemoryChatPersistence, LocalStorageChatPersistence
  src/transport        # ChatTransport, HttpChatTransport
  src/ui               # ChatComposer, ChatMessageList, ChatWidgetShell, FloatingChatTrigger

apps/demo              # 고객상담형 chat widget 예제
apps/console           # 내부 사용자용 운영 콘솔 예제
```

## 설치

현재는 로컬 workspace/sibling 프로젝트로 사용합니다.

```bash
pnpm add lee-chat-sdk@file:../lee-chat-sdk/packages/sdk
```

workspace 안에서는 다음처럼 참조합니다.

```json
{
  "dependencies": {
    "lee-chat-sdk": "workspace:*"
  }
}
```

## 핵심 API

### ChatMessage

메시지는 도메인 metadata를 generic으로 받을 수 있습니다.

```ts
import type { ChatMessage } from 'lee-chat-sdk'

interface BlogChatMetadata {
  citations?: Array<{ title: string; url: string }>
  refusalReason?: string
  followUpSuggestions?: string[]
  grounded?: boolean
}

const message: ChatMessage<BlogChatMetadata> = {
  id: 'assistant-message',
  conversationId: 'blog-chat:ko',
  role: 'assistant',
  content: '근거가 있는 답변입니다.',
  status: 'sent',
  createdAt: new Date().toISOString(),
  metadata: {
    grounded: true,
    citations: [{ title: '블로그 글', url: '/ko/blog/post' }],
  },
}
```

### ChatTransport

HTTP, mock, WebSocket, SSE 같은 전송 방식을 같은 인터페이스로 교체할 수 있습니다.

```ts
import type { ChatTransport } from 'lee-chat-sdk'

interface ChatRequest {
  question: string
}

interface ChatResponse {
  answer: string
}

const mockTransport: ChatTransport<ChatRequest, ChatResponse> = {
  async sendMessage(request) {
    return {
      answer: `"${request.question}"에 대한 응답입니다.`,
    }
  },
}
```

기본 HTTP transport도 제공합니다.

```ts
import { HttpChatTransport } from 'lee-chat-sdk'

const transport = new HttpChatTransport<ChatRequest, ChatResponse>({
  endpoint: '/api/chat',
})
```

### useChatController

controller는 입력값, 전송 중 상태, 메시지 추가, 실패 상태, 응답 메시지 생성을 관리합니다.

```tsx
'use client'

import {
  ChatComposer,
  ChatMessageList,
  ChatWidgetShell,
  MemoryChatPersistence,
  useChatController,
  type ChatMessage,
} from 'lee-chat-sdk'

interface SupportMetadata {
  agentName?: string
  assignmentStatus?: 'unassigned' | 'assigned' | 'closed'
}

interface SupportRequest {
  content: string
  conversationId: string
}

interface SupportResponse {
  content: string
  metadata: SupportMetadata
}

const persistence = new MemoryChatPersistence<ChatMessage<SupportMetadata>>()

export function SupportChatWidget() {
  const chat = useChatController<
    SupportRequest,
    SupportResponse,
    SupportMetadata
  >({
    conversationId: 'support-demo',
    persistence,
    transport: {
      async sendMessage(request) {
        return {
          content: `상담원이 확인 중입니다: ${request.content}`,
          metadata: {
            agentName: 'Mina',
            assignmentStatus: 'assigned',
          },
        }
      },
    },
    buildRequest: ({ content, conversationId }) => ({
      content,
      conversationId,
    }),
    buildAssistantMessage: ({ response }) => ({
      content: response.content,
      metadata: response.metadata,
    }),
  })

  return (
    <ChatWidgetShell
      title="Support Chat"
      description="고객상담 데모"
      footer={
        <ChatComposer
          inputId="support-message"
          label="상담 메시지"
          value={chat.inputValue}
          placeholder="문의 내용을 입력하세요"
          submitLabel={chat.isSubmitting ? '전송 중' : '보내기'}
          isLoading={chat.isSubmitting}
          onChange={chat.setInputValue}
          onSubmit={() => {
            void chat.submitMessage()
          }}
        />
      }
    >
      <ChatMessageList
        messages={chat.messages}
        renderMessage={(message) => (
          <article>
            <strong>{message.role}</strong>
            <p>{message.content}</p>
            {message.metadata?.assignmentStatus ? (
              <small>{message.metadata.assignmentStatus}</small>
            ) : null}
          </article>
        )}
      />
    </ChatWidgetShell>
  )
}
```

### ChatEvent

운영 콘솔에서는 메시지뿐 아니라 배정, 내부 메모, 고객 이벤트를 event stream으로 다룰 수 있습니다.

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
  buildChatEvent({
    id: 'event-2',
    conversationId: 'conversation-1',
    type: 'internal_note.created',
    createdAt: '2026-06-01T00:01:00.000Z',
    payload: { content: '결제 직전 이탈 가능성이 높음' },
  }),
]

const conversationEvents = collectChatEventsByConversationId({
  events,
  conversationId: 'conversation-1',
})
```

## 예제 앱

### Support Chat Demo

고객상담형 floating chat widget 예제입니다.

```bash
pnpm --filter lee-chat-sdk-demo dev
```

포함된 내용:

- `useChatController`로 메시지 상태 관리
- `MemoryChatPersistence`로 세션 내 메시지 저장
- mock support transport
- `SupportChatMetadata`로 상담자 이름, 고객 이벤트, 배정 상태 표현

### Operator Console

내부 사용자용 운영 콘솔 예제입니다.

```bash
pnpm --filter lee-chat-sdk-console dev
```

포함된 내용:

- 대화 목록
- 메시지 스레드
- 고객 컨텍스트 패널
- unread count
- assigned/unassigned/closed 상태
- 상담자 배정
- 내부 메모
- 고객 이벤트 타임라인
- `ChatEvent` 기반 event stream 수집

## 블로그 프로젝트에서의 사용

`leey00nsu-next-blog-v2`는 `lee-chat-sdk`를 sibling dependency로 연결합니다.

```json
{
  "dependencies": {
    "lee-chat-sdk": "file:../lee-chat-sdk/packages/sdk"
  }
}
```

블로그 쪽에 남아 있는 책임:

- `/api/chat` 응답 스키마 검증
- locale/currentPostSlug 전달
- citation/refusal/follow-up 렌더링
- 기존 localStorage payload 호환성 유지

SDK로 분리된 책임:

- 전송 중 상태
- user/assistant 메시지 생성
- failed 상태 처리
- transport 교체 가능성
- persistence 주입
- 공통 UI primitive

## 개발 명령어

```bash
pnpm install
pnpm typecheck
pnpm test:run
pnpm build
```

개별 패키지 실행:

```bash
pnpm --filter lee-chat-sdk test:run
pnpm --filter lee-chat-sdk-demo test:run
pnpm --filter lee-chat-sdk-console test:run
```

## 현재 한계와 다음 단계

아직 production-ready SDK는 아닙니다. 다음 단계가 필요합니다.

- UI primitive를 headless와 styled package로 분리
- package export path 세분화
- WebSocket/SSE transport 추가
- retry, optimistic update, message resend 정책 추가
- conversation list/controller API 추가
- 접근성 스타일과 keyboard interaction 보강
- Storybook 문서화
- npm publish 전 semantic versioning과 changelog 도입
