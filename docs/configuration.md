# Configuration

`LeeChatConfig`는 widget의 identity, endpoint, persistence, auth, feature, copy, theme을 제어합니다.

```ts
import { LEE_CHAT_TEXT_PRESETS, type LeeChatConfig } from 'lee-chat-sdk'

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
  resetKey: 'pricing-page',
  persistence: 'localStorage',
  features: {
    attachments: false,
    realtime: false,
    operatorConsole: false,
  },
  messageStatus: {
    showSending: false,
  },
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
    ...LEE_CHAT_TEXT_PRESETS.ko,
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

## 동적 갱신

- `conversation.id` 변경: 다른 conversation으로 전환하고 해당 persistence namespace의 메시지를 불러옵니다.
- `conversation.metadata` 변경: 메시지는 유지하며 다음 request의 `conversation.metadata`부터 새 값을 사용합니다.
- 최상위 `metadata` 변경: 메시지는 유지하며 다음 request의 `metadata`부터 새 값을 사용합니다.
- `resetKey` 변경: 같은 conversation ID라도 controller와 persistence namespace를 초기화합니다. 게시물별 새 대화를 강제하려면 route slug를 `resetKey`로 사용할 수 있습니다.

```tsx
<LeeChatProvider
  config={{
    appId: 'blog',
    endpoint: '/api/chat',
    metadata: {
      locale,
      currentPostSlug: post.slug,
    },
    conversation: {
      metadata: {
        currentPostSlug: post.slug,
      },
    },
    resetKey: post.slug,
  }}
>
  <LeeChatWidget />
</LeeChatProvider>
```

route가 바뀌어도 같은 대화를 이어가려면 `resetKey`를 생략하고 metadata만 갱신하세요.

## Text Preset

`LEE_CHAT_TEXT_PRESETS.ko`와 `LEE_CHAT_TEXT_PRESETS.en`을 제공하며 `texts`는 partial override를 허용합니다.

## Feature Flags

- `attachments`: `false`이면 upload callback이 있어도 첨부 UI를 숨깁니다.
- `realtime`: `false`이면 전달된 event transport를 구독하지 않습니다.
- `operatorConsole`: 기본값은 `false`입니다. 운영자 콘솔은 Widget에 포함되지 않는 별도 experimental API이며 이 값으로 Widget에 콘솔 UI가 추가되지는 않습니다.

## Message Status

`messageStatus.showSending`은 React, Vanilla, script-tag 위젯에서 사용자 메시지의 기본 sending 문구 표시 여부를 제어합니다. 기본값은 `true`입니다.

React에서 역할이나 metadata에 따라 상태별로 제어하려면 `LeeChatWidget.renderMessageStatus`를 사용하세요. `showSending: false`는 기본 sending UI에만 적용되며 failed/retry/read receipt UI에는 영향을 주지 않습니다.
