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

