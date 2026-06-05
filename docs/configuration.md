# Configuration

`LeeChatConfig`는 widget의 identity, endpoint, persistence, auth, copy, theme을 제어합니다.

```ts
import type { LeeChatConfig } from 'lee-chat-sdk'

const config: LeeChatConfig = {
  appId: 'commerce-web',
  endpoint: '/api/chat',
  conversation: {
    kind: 'support',
  },
  visitor: {
    id: 'visitor-123',
    metadata: {
      source: 'pricing-page',
    },
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
  initialMessage: '무엇을 도와드릴까요?',
  persistence: 'localStorage',
  requestTimeoutMs: 15000,
  requestRetry: {
    maxAttempts: 2,
    delayMs: 300,
  },
  requestHeaders: () => ({
    Authorization: `Bearer ${getAccessToken()}`,
  }),
  requestAuth: {
    refresh: async () => {
      await refreshAccessToken()
    },
  },
  texts: {
    title: '상담',
    subtitle: '궁금한 점을 남겨주세요.',
    triggerLabel: '상담 열기',
    placeholder: '메시지를 입력하세요',
    send: '보내기',
    sending: '전송 중',
    messageSending: '전송 중...',
    assistantLoading: '답변을 작성 중입니다...',
    participantOnline: '온라인',
    participantTyping: '입력 중입니다...',
    messageRead: '읽음',
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

## Identity

- `appId`: SDK instance와 visitor storage를 분리하는 필수 식별자입니다.
- `visitor.id`: 익명 방문자 식별자입니다. 직접 주지 않으면 localStorage에 생성됩니다.
- `participant.id`: 로그인 사용자/상담원 식별자입니다. 직접 주면 visitor보다 우선합니다.
- `conversation.id`: 직접 주지 않으면 app/visitor 또는 app/participant 기준으로 생성됩니다.

## Request Auth

`requestHeaders`는 객체 또는 함수를 받을 수 있습니다. 함수는 매 요청마다 다시 평가되므로 토큰 갱신 후 새 값을 사용할 수 있습니다.

```ts
initLeeChat({
  appId: 'commerce-web',
  endpoint: '/api/chat',
  requestHeaders: () => ({
    Authorization: `Bearer ${authStore.accessToken}`,
  }),
  requestAuth: {
    refresh: async ({ status }) => {
      if (status === 401) {
        await authStore.refresh()
      }
    },
    refreshStatusCodes: [401],
    maxRefreshAttempts: 1,
  },
})
```

## Persistence

- `memory`: 현재 SDK instance 안에서만 메시지를 유지합니다.
- `localStorage`: 브라우저 localStorage에 conversation별 메시지를 저장합니다.

서버 저장/조회는 `ConversationSyncClient`와 host backend contract를 사용하세요.

