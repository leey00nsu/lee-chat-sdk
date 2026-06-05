# lee-chat-sdk

한국어 | [English](./README.en.md)

웹사이트에 채팅 경험을 삽입하기 위한 drop-in chat SDK입니다. React, Vanilla JavaScript, script tag 방식으로 사용할 수 있습니다.

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
import 'lee-chat-sdk/style.css'

export function App() {
  return (
    <LeeChatProvider
      config={{
        appId: 'my-service',
        endpoint: '/api/chat',
        initialMessage: '무엇을 도와드릴까요?',
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
import 'lee-chat-sdk/style.css'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
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
  LeeChat.initLeeChat({
    appId: 'my-service',
    endpoint: '/api/chat',
    initialMessage: '무엇을 도와드릴까요?',
    isolation: 'shadowDom',
  })
</script>
```

패키지 빌드 산출물 기준 파일 경로는 `dist/lee-chat.global.js`입니다. CDN 업로드용 SRI 값은 `dist/lee-chat.global.manifest.json`에 생성됩니다.

## Backend

SDK는 client-side UI와 contract를 제공합니다. 실제 메시지 저장, 인증/권한, rate limit, tenant 분리, 첨부파일 저장, realtime broadcast는 host app backend가 담당합니다.

운영 route는 `lee-chat-sdk/server`의 `createLeeChatRouteHandler()`에 DB storage adapter를 연결해 구현할 수 있습니다.

## 문서

전체 문서는 저장소 루트에서 확인하세요.

- Integration Guide: `docs/integration.md`
- Configuration: `docs/configuration.md`
- API Reference: `docs/api.md`
- Backend Contract: `docs/backend-contract.ko.md`
- Operator Console: `docs/operator-console.md`

운영자 콘솔 API는 experimental primitive입니다. production-ready 콘솔이 아니며, 실제 운영에는 host app의 상담원 mutation API, 권한, 라우팅 정책, 영구 저장소, realtime backend가 필요합니다.

