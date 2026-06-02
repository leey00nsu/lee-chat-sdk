import { useEffect, useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  LeeChatProvider,
  LeeChatWidget,
  useLeeChat,
  type LeeChatConfig,
  type LeeChatRequest,
} from 'lee-chat-sdk'

interface WidgetStoryProps {
  config: LeeChatConfig
  seededMessages?: string[]
  renderMode?: 'default' | 'compact'
}

const STORY_ENDPOINT = '/api/storybook-chat'

async function storybookFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const requestBody = JSON.parse(String(init?.body)) as LeeChatRequest

  if (requestBody.appId.includes('failure')) {
    throw new Error('Storybook failure response')
  }

  if (requestBody.appId.includes('sending')) {
    return new Promise(() => {})
  }

  return new Response(
    JSON.stringify({
      message: {
        content: `Story response: ${requestBody.message.content}`,
        metadata: {
          endpoint: String(input),
        },
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

function SeedMessages({ messages }: { messages: string[] }) {
  const leeChat = useLeeChat()
  const didSeedMessagesRef = useRef(false)

  useEffect(() => {
    if (didSeedMessagesRef.current) {
      return
    }

    didSeedMessagesRef.current = true
    messages.forEach((message) => {
      void leeChat.submitMessage(message)
    })
  }, [leeChat, messages])

  return null
}

function WidgetStory({
  config,
  seededMessages = [],
  renderMode = 'default',
}: WidgetStoryProps) {
  return (
    <LeeChatProvider config={config} fetchImplementation={storybookFetch}>
      {seededMessages.length > 0 ? <SeedMessages messages={seededMessages} /> : null}
      <LeeChatWidget
        renderMessage={
          renderMode === 'compact'
            ? ({ message }) => (
                <article className="lee-chat-message">
                  <strong>{message.role}</strong>
                  <p>{message.content}</p>
                </article>
              )
            : undefined
        }
      />
    </LeeChatProvider>
  )
}

const meta = {
  title: 'Lee Chat/LeeChatWidget',
  component: WidgetStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Drop-in chat widget states used to review default styling, placement, and long message behavior.',
      },
    },
  },
} satisfies Meta<typeof WidgetStory>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    config: {
      appId: 'storybook-default',
      endpoint: STORY_ENDPOINT,
      texts: {
        title: 'Support',
        subtitle: 'Send us a message.',
        triggerLabel: 'Open support chat',
      },
    },
  },
}

export const InitialOpen: Story = {
  args: {
    config: {
      appId: 'storybook-initial-open',
      endpoint: STORY_ENDPOINT,
      initialOpen: true,
      texts: {
        title: 'Support',
        subtitle: 'This story opens the panel by default.',
      },
    },
  },
}

export const LongMessages: Story = {
  args: {
    config: {
      appId: 'storybook-long-messages',
      endpoint: STORY_ENDPOINT,
      initialOpen: true,
      texts: {
        title: 'Long conversation',
        subtitle: 'Review scroll behavior with long content.',
      },
    },
    seededMessages: [
      'I need help choosing the right plan for a team with multiple workspaces.',
      'Can you explain how billing changes when seats are added in the middle of a month?',
      'Also, please include details about account ownership, data retention, and support response time.',
    ],
  },
}

export const Sending: Story = {
  args: {
    config: {
      appId: 'storybook-sending',
      endpoint: STORY_ENDPOINT,
      initialOpen: true,
      texts: {
        title: 'Sending',
        subtitle: 'Review pending user message and assistant loading states.',
      },
    },
    seededMessages: ['This request intentionally stays pending.'],
  },
}

export const FailedWithRetry: Story = {
  args: {
    config: {
      appId: 'storybook-failure',
      endpoint: STORY_ENDPOINT,
      initialOpen: true,
      texts: {
        title: 'Failed Message',
        subtitle: 'Review failed message and retry affordance.',
      },
    },
    seededMessages: ['This request intentionally fails.'],
  },
}

export const CustomTheme: Story = {
  args: {
    config: {
      appId: 'storybook-custom-theme',
      endpoint: STORY_ENDPOINT,
      initialOpen: true,
      theme: {
        primaryColor: '#0f766e',
        radius: '8px',
      },
      texts: {
        title: 'Custom Theme',
        subtitle: 'Primary color and radius are configured by SDK theme tokens.',
      },
    },
  },
}

export const BottomLeft: Story = {
  args: {
    config: {
      appId: 'storybook-bottom-left',
      endpoint: STORY_ENDPOINT,
      initialOpen: true,
      position: 'bottom-left',
      texts: {
        title: 'Bottom Left',
        subtitle: 'The launcher and panel are anchored to the left side.',
      },
    },
  },
}

export const CustomRender: Story = {
  args: {
    config: {
      appId: 'storybook-custom-render',
      endpoint: STORY_ENDPOINT,
      initialOpen: true,
      texts: {
        title: 'Custom Render',
        subtitle: 'Messages are rendered through LeeChatWidget renderMessage.',
      },
    },
    renderMode: 'compact',
    seededMessages: ['Render this message with a custom renderer.'],
  },
}
