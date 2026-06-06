# Configuration

`LeeChatConfig` controls widget identity, endpoint, persistence, auth, features, copy, and theme.

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
  initialMessage: 'How can I help?',
  resetKey: 'pricing-page',
  persistence: 'localStorage',
  features: {
    attachments: false,
    realtime: false,
    operatorConsole: false,
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
    ...LEE_CHAT_TEXT_PRESETS.en,
    title: 'Support',
    subtitle: 'Send us a message.',
    triggerLabel: 'Open chat',
    placeholder: 'Type your message',
    send: 'Send',
    sending: 'Sending',
    messageSending: 'Sending...',
    assistantLoading: 'Writing a reply...',
    participantOnline: 'Online',
    participantTyping: 'Typing...',
    messageRead: 'Read',
    error: 'Failed to send. Please try again.',
    retry: 'Retry',
  },
  theme: {
    colorScheme: 'light',
    primaryColor: '#111827',
    radius: '12px',
  },
}
```

## Identity

- `appId`: required identifier that separates SDK instances and visitor storage.
- `visitor.id`: anonymous visitor identifier. If omitted, the SDK creates one in localStorage.
- `participant.id`: logged-in user/operator identifier. If provided, it takes precedence over visitor identity.
- `conversation.id`: if omitted, the SDK derives it from app/visitor or app/participant identity.

## Request Auth

`requestHeaders` can be an object or a function. Functions are evaluated for every request, so refreshed tokens can be picked up immediately.

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

- `memory`: keeps messages only inside the current SDK instance.
- `localStorage`: stores conversation messages in browser localStorage.

For server persistence and sync, use `ConversationSyncClient` with the host backend contract.

## Dynamic Updates

- Changing `conversation.id` switches conversations and loads messages from the new persistence namespace.
- Changing `conversation.metadata` keeps messages and applies the new value to the next request.
- Changing top-level `metadata` keeps messages and applies the new value to the next request.
- Changing `resetKey` resets the controller and persistence namespace even when the conversation ID is unchanged. A route slug can force a fresh conversation per page.

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

Omit `resetKey` and update only metadata when navigation should continue the same conversation.

## Text Presets

`LEE_CHAT_TEXT_PRESETS.ko` and `LEE_CHAT_TEXT_PRESETS.en` are available, and `texts` accepts partial overrides.

## Feature Flags

- `attachments`: hides attachment UI even when an upload callback exists.
- `realtime`: prevents subscription to a supplied event transport.
- `operatorConsole`: defaults to `false`. Operator console APIs remain separate experimental APIs; this flag does not inject console UI into the widget.
