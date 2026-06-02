# lee-chat-sdk

한국어 | [English](./README.en.md)

웹사이트에 고객상담 채팅 UI를 붙이기 위한 drop-in chat widget kit입니다. React 앱에서는 `LeeChatProvider`와 `LeeChatWidget`을 사용하고, 일반 JavaScript 환경에서는 `initLeeChat()`을 호출합니다.

## 설치

```bash
pnpm add lee-chat-sdk
```

```bash
npm install lee-chat-sdk
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
import { initLeeChat } from 'lee-chat-sdk'

const leeChat = initLeeChat({
  appId: 'my-service',
  endpoint: '/api/chat',
})

leeChat.open()
```

## CSS

패키지의 기본 위젯 CSS는 root import에 포함됩니다. 별도로 CSS만 가져와야 하는 bundler라면 다음 subpath를 사용할 수 있습니다.

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

## Backend Contract

SDK는 `endpoint`로 `LeeChatRequest`를 POST 전송하고, `LeeChatResponse` 형태의 응답을 기대합니다.

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'
```

자세한 사용법과 개발 문서는 저장소 루트의 README를 확인하세요.
