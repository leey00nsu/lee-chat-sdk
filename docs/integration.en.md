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

