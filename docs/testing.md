# Testing

`lee-chat-sdk/testing`은 host app의 route, React 통합, message 렌더링 테스트에 사용할 결정적 factory와 mock server를 제공합니다.

## Factory

```ts
import {
  createMockChatMessage,
  createMockLeeChatProviderConfig,
  createMockLeeChatRequest,
  createMockLeeChatResponse,
} from 'lee-chat-sdk/testing'

const request = createMockLeeChatRequest({
  metadata: {
    locale: 'ko',
  },
  message: {
    content: '이 글을 요약해줘',
  },
})

const response = createMockLeeChatResponse({
  message: {
    content: '요약 결과',
    metadata: {
      blogChatResponse: {
        grounded: true,
      },
    },
  },
})

const message = createMockChatMessage({
  role: 'assistant',
  metadata: response.message.metadata,
})

const config = createMockLeeChatProviderConfig({
  initialOpen: true,
  features: {
    attachments: false,
    realtime: false,
  },
})
```

factory 기본 ID와 시간은 고정되어 snapshot과 equality assertion이 안정적입니다. override의 `content`만 바꾸면 기본 text part도 같은 값으로 생성됩니다.

## React Test

`lee-chat-sdk/testing`은 React 비의존 entry를 유지합니다. 테스트 wrapper는 host test 안에서 명시적으로 구성하세요.

```tsx
const config = createMockLeeChatProviderConfig({
  initialOpen: true,
})

render(
  <LeeChatProvider config={config} fetchImplementation={fetchMock}>
    <LeeChatWidget />
  </LeeChatProvider>,
)
```

## Mock Server

`createMockLeeChatServer()`는 `fetch`, `syncClient`, `eventTransport`를 함께 제공하므로 message POST, conversation sync, realtime event를 한 테스트에서 연결할 수 있습니다.
