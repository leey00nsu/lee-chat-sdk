import { describe, expect, it } from 'vitest'
import { resolveLeeChatConfig } from './lee-chat-config'

describe('resolveLeeChatConfig', () => {
  it('required config에 기본 widget 설정을 병합한다', () => {
    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
    })

    expect(config).toEqual(
      expect.objectContaining({
        appId: 'app',
        endpoint: '/api/chat',
        position: 'bottom-right',
        initialOpen: false,
        persistence: 'memory',
        texts: expect.objectContaining({
          title: 'Chat',
          subtitle: 'Send us a message.',
          triggerLabel: 'Open chat',
          placeholder: 'Type your message',
          send: 'Send',
          sending: 'Sending',
          error: 'Message failed. Please try again.',
        }),
        theme: expect.objectContaining({
          colorScheme: 'light',
          primaryColor: '#111827',
          radius: '12px',
        }),
      }),
    )
  })

  it('사용자 texts, theme, className 설정을 보존한다', () => {
    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
      texts: {
        title: 'Support',
      },
      theme: {
        primaryColor: '#2563eb',
      },
      className: {
        trigger: 'custom-trigger',
      },
    })

    expect(config.texts.title).toBe('Support')
    expect(config.texts.send).toBe('Send')
    expect(config.theme.primaryColor).toBe('#2563eb')
    expect(config.theme.radius).toBe('12px')
    expect(config.className?.trigger).toBe('custom-trigger')
  })
})
