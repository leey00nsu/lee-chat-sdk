# Configuration

`LeeChatConfig` controls widget identity, endpoint, persistence, auth, copy, and theme.

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
  initialMessage: 'How can I help?',
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

