# Integration Guide

`lee-chat-sdk` can be embedded with React, Vanilla JavaScript, or a script tag.

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
        initialMessage: 'How can I help?',
      }}
      syncClient={syncClient}
    >
      <LeeChatWidget />
    </LeeChatProvider>
  )
}
```

### Structured responses and typed metadata

Use the same metadata type on the provider, widget, and hook to render structured responses without casts. `renderAssistantContent` and `renderMessageFooter` extend the default bubble without replacing the entire `renderMessage`.

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

When `renderMessage` is also provided, full message rendering takes precedence and the content/footer slots are not called.

### Reusing an existing backend or LLM

Keep an existing `{ question, conversationHistory }` LLM/RAG function and adapt only the SDK request and response.

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
    locale: metadata?.locale ?? 'en',
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
  initialMessage: 'How can I help?',
  isolation: 'shadowDom',
})

leeChat.open()
```

## Script Tag

Upload `dist/lee-chat.global.js` to your CDN to use the global `LeeChat` API. The IIFE bundle includes the default widget CSS.

```html
<script src="https://cdn.example.com/lee-chat.global.js"></script>
<script>
  LeeChat.initLeeChat({
    appId: 'my-service',
    endpoint: '/api/chat',
    initialMessage: 'How can I help?',
    isolation: 'shadowDom',
  })
</script>
```

## Attachment Upload

The host app owns the actual file upload. React uses the `LeeChatWidget` prop; Vanilla/script-tag integrations use the same contract through `initLeeChat()`.

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

See [Backend Contract](./backend-contract.md) for the upload endpoint contract.

## Realtime

Pass an SSE or WebSocket transport to the provider or Vanilla config.

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

Browser `EventSource` and `WebSocket` APIs cannot inject arbitrary headers. Use cookie auth or short-lived URL tokens when realtime auth is required.

## Styling

Default CSS:

```ts
import 'lee-chat-sdk/style.css'
```

`theme.primaryColor` and `theme.radius` are applied to `.lee-chat-root`, not the host page `:root`. In the Vanilla/script-tag path, use `isolation: 'shadowDom'` for stronger host CSS and DOM separation.

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
