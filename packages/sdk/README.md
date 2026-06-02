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

기본 UI는 `sending`, `failed`, retry, assistant loading 상태를 포함합니다. 문구는 `config.texts`, class hook은 `config.className`으로 조정할 수 있습니다. React에서는 `LeeChatWidget`의 `renderMessage`, `renderAssistantLoading`으로 메시지 렌더링을 교체할 수 있습니다.

## Backend Contract

SDK는 `endpoint`로 `LeeChatRequest`를 POST 전송하고, `LeeChatResponse` 형태의 응답을 기대합니다.

```ts
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'
```

자세한 사용법과 개발 문서는 저장소 루트의 README를 확인하세요.
