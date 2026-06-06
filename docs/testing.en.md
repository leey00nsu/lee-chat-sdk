# Testing

`lee-chat-sdk/testing` provides deterministic factories and a mock server for host route, React integration, and message rendering tests.

## Factories

```ts
import {
  createMockChatMessage,
  createMockLeeChatProviderConfig,
  createMockLeeChatRequest,
  createMockLeeChatResponse,
} from 'lee-chat-sdk/testing'

const request = createMockLeeChatRequest({
  metadata: {
    locale: 'en',
  },
  message: {
    content: 'Summarize this post',
  },
})

const response = createMockLeeChatResponse({
  message: {
    content: 'Summary result',
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

Factory IDs and timestamps are fixed for stable snapshots and equality assertions. Overriding only `content` also creates matching default text parts.

## React Tests

`lee-chat-sdk/testing` remains a React-free entry. Build the wrapper explicitly in the host test.

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

`createMockLeeChatServer()` provides `fetch`, `syncClient`, and `eventTransport` together so one test can cover message POST, conversation sync, and realtime events.
