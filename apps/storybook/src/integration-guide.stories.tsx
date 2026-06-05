import type { Meta, StoryObj } from '@storybook/react-vite'

interface IntegrationGuideSection {
  title: string
  description: string
  code: string
}

const GUIDE_SECTIONS: IntegrationGuideSection[] = [
  {
    title: 'Install',
    description: 'Install the package and import the default widget CSS once.',
    code: `pnpm add lee-chat-sdk

import 'lee-chat-sdk/style.css'`,
  },
  {
    title: 'React widget',
    description: 'Use the provider and widget when the host app is React.',
    code: `import {
  ConversationSyncClient,
  LeeChatProvider,
  LeeChatWidget,
} from 'lee-chat-sdk'

const syncClient = new ConversationSyncClient({
  endpoint: '/api/chat',
})

export function App() {
  return (
    <LeeChatProvider
      config={{
        appId: 'commerce-web',
        endpoint: '/api/chat',
      }}
      syncClient={syncClient}
    >
      <LeeChatWidget
        uploadAttachment={async (file) => {
          const uploadedFile = await uploadFileToStorage(file)

          return {
            kind: 'file',
            url: uploadedFile.url,
            name: file.name,
            mediaType: file.type,
            size: file.size,
          }
        }}
      />
    </LeeChatProvider>
  )
}`,
  },
  {
    title: 'Vanilla widget',
    description: 'Use the no-React subpath when embedding from plain JavaScript.',
    code: `import { initLeeChat } from 'lee-chat-sdk/vanilla'

const leeChat = initLeeChat({
  appId: 'commerce-web',
  endpoint: '/api/chat',
  uploadAttachment: async (file) => {
    const uploadedFile = await uploadFileToStorage(file)

    return {
      kind: 'file',
      url: uploadedFile.url,
      name: file.name,
      mediaType: file.type,
      size: file.size,
    }
  },
})

leeChat.open()`,
  },
  {
    title: 'Script tag',
    description:
      'Use the IIFE build for sites without a bundler. The script injects the default widget CSS.',
    code: `<script src="https://cdn.example.com/lee-chat.global.js"></script>
<script>
  LeeChat.initLeeChat({
    appId: 'commerce-web',
    endpoint: '/api/chat',
    initialMessage: 'How can I help?',
    isolation: 'shadowDom',
  })
</script>`,
  },
  {
    title: 'Auth and realtime',
    description:
      'Use request headers for message POSTs and endpoint factories for browser realtime transports.',
    code: `import { SseChatEventTransport } from 'lee-chat-sdk'

const eventTransport = new SseChatEventTransport({
  endpoint: () => \`/api/chat/events?token=\${authStore.accessToken}\`,
  auth: {
    refresh: () => authStore.refresh(),
  },
  reconnect: {
    enabled: true,
  },
})`,
  },
  {
    title: 'Server sync',
    description:
      'Load stored conversations/messages and sync read receipts with the headless client.',
    code: `import { ConversationSyncClient } from 'lee-chat-sdk'

const syncClient = new ConversationSyncClient({
  endpoint: '/api/chat',
  headers: () => ({
    Authorization: \`Bearer \${authStore.accessToken}\`,
  }),
})

await syncClient.listConversations({
  appId: 'commerce-web',
  visitorId: 'visitor-123',
})`,
  },
]

function IntegrationGuide() {
  return (
    <article className="integration-guide-story">
      <header>
        <p>lee-chat-sdk</p>
        <h1>Website Chat SDK Integration</h1>
      </header>
      <div className="integration-guide-grid">
        {GUIDE_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <pre>
              <code>{section.code}</code>
            </pre>
          </section>
        ))}
      </div>
    </article>
  )
}

const meta = {
  title: 'Lee Chat/Integration Guide',
  component: IntegrationGuide,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Implementation-oriented guide for installing and embedding the SDK in React and vanilla JavaScript websites.',
      },
    },
  },
} satisfies Meta<typeof IntegrationGuide>

export default meta

type Story = StoryObj<typeof meta>

export const EmbeddingGuide: Story = {}
