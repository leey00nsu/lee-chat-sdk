# Integration Guide

`lee-chat-sdk`는 React, Vanilla JavaScript, script tag 세 가지 방식으로 붙일 수 있습니다.

## React

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

### 구조화 응답과 metadata 타입

Provider, Widget, hook에 같은 metadata 타입을 지정하면 캐스팅 없이 구조화 응답을 렌더링할 수 있습니다. `renderMessage` 전체를 교체하지 않고 `renderAssistantContent`와 `renderMessageFooter`로 기본 말풍선을 확장할 수 있습니다.

```tsx
interface BlogChatMessageMetadata {
  blogChatResponse?: {
    citations: Array<{ title: string; url: string }>
    followUpSuggestions: string[]
  }
}

<LeeChatProvider<BlogChatMessageMetadata> config={config}>
  <LeeChatWidget<BlogChatMessageMetadata>
    renderAssistantContent={({ message, defaultContent }) => (
      <>
        {defaultContent}
        {message.metadata?.blogChatResponse?.citations.map((citation) => (
          <a key={citation.url} href={citation.url}>
            {citation.title}
          </a>
        ))}
      </>
    )}
    renderMessageFooter={({ message }) => (
      <div>
        {message.metadata?.blogChatResponse?.followUpSuggestions.map(
          (suggestion) => <button key={suggestion}>{suggestion}</button>,
        )}
      </div>
    )}
  />
</LeeChatProvider>
```

`renderMessage`를 함께 지정하면 전체 메시지 렌더링이 우선하며 content/footer 슬롯은 호출되지 않습니다.

### 메시지 전송 상태와 assistant loading

사용자 메시지는 즉시 표시하면서 사용자 버블의 sending 문구만 숨기고, 별도 assistant loading 버블은 유지할 수 있습니다.

```tsx
<LeeChatWidget
  renderMessageStatus={({ message, defaultContent }) => {
    if (message.role === 'user' && message.status === 'sending') {
      return null
    }

    return defaultContent
  }}
  renderAssistantLoading={() => (
    <span className="assistant-generation-loading">
      답변을 준비하고 있어요...
    </span>
  )}
/>
```

- `texts.messageSending`: 개별 사용자 메시지의 전송 상태 문구입니다.
- `texts.assistantLoading`: 서버 응답을 기다리는 별도 assistant loading 문구입니다.
- `renderMessageStatus`: `sending`, `failed`, `delivered`, `read` 등 개별 메시지 상태 영역을 바꿉니다. `defaultContent`에는 기본 오류/retry/read receipt UI가 포함됩니다.
- `renderAssistantLoading`: 별도 assistant loading 버블의 콘텐츠를 바꿉니다. 기본 버블 스타일, 간격, `role="status"`는 SDK가 유지합니다.

`renderMessageStatus`가 `null`을 반환하면 빈 상태 요소를 남기지 않습니다. 커스텀 loading 애니메이션은 host CSS에서 `prefers-reduced-motion`을 처리하세요.

### 보내기 버튼 콘텐츠

`renderSubmitContent`로 기본 submit 버튼 안에 아이콘, spinner, 텍스트 같은 ReactNode를 렌더링할 수 있습니다.

```tsx
<LeeChatWidget
  renderSubmitContent={({
    isSubmitting,
    isUploading,
    defaultContent,
  }) => (
    <>
      {isSubmitting || isUploading
        ? <LoaderCircle aria-hidden="true" />
        : <Send aria-hidden="true" />}
      <span>{defaultContent}</span>
    </>
  )}
/>
```

`defaultContent`는 현재 상태에 따라 `texts.send` 또는 `texts.sending`입니다. SDK는 버튼의 접근 가능한 이름, `type="submit"`, disabled 상태, Enter 전송, 첨부파일 업로드 상태를 계속 관리합니다. 버튼 전체를 교체할 필요가 없습니다.

### 기존 backend/LLM 재사용

기존 `{ question, conversationHistory }` 형태의 LLM/RAG 함수를 유지하면서 SDK request/response만 변환할 수 있습니다.

```ts
import {
  collectLeeChatTurnHistory,
  createLeeChatTextResponse,
  getLeeChatRequestMetadata,
  getLeeChatRequestText,
  isLeeChatRequest,
} from 'lee-chat-sdk/server'

export async function POST(request: Request) {
  const body: unknown = await request.json()

  if (!isLeeChatRequest(body)) {
    return legacyHandler(body)
  }

  const metadata = getLeeChatRequestMetadata<{
    locale?: 'ko' | 'en'
    currentPostSlug?: string
  }>(body)
  const result = await answerBlogChatQuestion({
    question: getLeeChatRequestText(body),
    locale: metadata?.locale ?? 'ko',
    currentPostSlug: metadata?.currentPostSlug,
    conversationHistory: collectLeeChatTurnHistory(body).map((turn) => ({
      question: turn.user.content,
      answer: turn.assistant?.content,
    })),
  })

  return Response.json(
    createLeeChatTextResponse({
      request: body,
      content: result.answer,
      metadata: {
        blogChatResponse: result,
      },
    }),
  )
}
```

## Vanilla JS

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

## Script Tag

`dist/lee-chat.global.js`를 CDN에 올리면 전역 `LeeChat` API를 사용할 수 있습니다. 이 IIFE 번들은 기본 위젯 CSS를 포함합니다.

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

## Attachment Upload

파일 업로드 자체는 host app이 수행합니다. React는 `LeeChatWidget` prop, Vanilla/script tag는 `initLeeChat()` config로 같은 contract를 사용합니다.

```tsx
<LeeChatWidget
  uploadAttachment={async (file) => {
    const body = new FormData()
    body.set('file', file)

    const response = await fetch('/api/chat/attachments', {
      method: 'POST',
      body,
    })

    return response.json()
  }}
/>
```

업로드 endpoint contract는 [Backend Contract](./backend-contract.ko.md)를 참고하세요.

## Realtime

SSE 또는 WebSocket transport를 provider/Vanilla config에 전달할 수 있습니다.

```ts
import { SseChatEventTransport } from 'lee-chat-sdk'

const eventTransport = new SseChatEventTransport({
  endpoint: () => `/api/chat/events?token=${authStore.accessToken}`,
  auth: {
    refresh: () => authStore.refresh(),
  },
  reconnect: {
    enabled: true,
  },
})
```

브라우저 `EventSource`/`WebSocket`은 임의 header 주입이 제한됩니다. 인증이 필요하면 cookie auth 또는 짧은 수명의 URL token을 사용하세요.

## Styling

기본 CSS:

```ts
import 'lee-chat-sdk/style.css'
```

`theme.primaryColor`와 `theme.radius`는 host page의 `:root`가 아니라 `.lee-chat-root`에 적용됩니다. Vanilla/script tag 경로에서는 `isolation: 'shadowDom'`으로 host CSS와 위젯 DOM을 더 강하게 분리할 수 있습니다.

```ts
initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
  className: {
    root: 'my-chat-root',
    trigger: 'my-chat-trigger',
    panel: 'my-chat-panel',
  },
})
```
