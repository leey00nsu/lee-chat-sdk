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

### Message sending status and assistant loading

Show the user message immediately while hiding only its sending label and preserving the separate assistant loading bubble.

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
      Preparing an answer...
    </span>
  )}
/>
```

- `texts.messageSending`: sending label for an individual user message.
- `texts.assistantLoading`: text in the separate assistant loading bubble while waiting for the server.
- `renderMessageStatus`: customizes each message status area, including `sending`, `failed`, `delivered`, and `read`. `defaultContent` includes the built-in error, retry, and read receipt UI.
- `renderAssistantLoading`: customizes the content of the separate assistant loading bubble. The SDK preserves its bubble styles, spacing, and `role="status"`.

Returning `null` from `renderMessageStatus` leaves no empty status element. Handle `prefers-reduced-motion` in host CSS for custom loading animations.

### Submit button content

Use `renderSubmitContent` to render icons, spinners, text, or other ReactNode content inside the default submit button.

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

`defaultContent` is `texts.send` or `texts.sending` for the current state. The SDK continues to manage the accessible button name, `type="submit"`, disabled state, Enter submission, and attachment upload state.

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
