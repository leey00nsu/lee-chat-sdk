'use client'

import { useEffect } from 'react'
import { ChatComposer } from '../ui/chat-composer'
import { ChatMessageList } from '../ui/chat-message-list'
import { useLeeChat } from './use-lee-chat'
import './lee-chat-widget.css'

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function resolvePositionClassName(position: string): string {
  return position === 'bottom-left'
    ? 'lee-chat-root--bottom-left'
    : 'lee-chat-root--bottom-right'
}

export function LeeChatWidget() {
  const leeChat = useLeeChat()
  const { config, chat } = leeChat

  useEffect(() => {
    const rootStyle = document.documentElement.style
    rootStyle.setProperty('--lee-chat-primary', config.theme.primaryColor)
    rootStyle.setProperty('--lee-chat-radius', config.theme.radius)
  }, [config.theme.primaryColor, config.theme.radius])

  return (
    <div
      data-testid="lee-chat-root"
      className={mergeClassNames(
        'lee-chat-root',
        resolvePositionClassName(config.position),
        config.className?.root,
      )}
    >
      {leeChat.isOpen ? (
        <section
          aria-label={config.texts.title}
          className={mergeClassNames('lee-chat-panel', config.className?.panel)}
        >
          <header
            className={mergeClassNames(
              'lee-chat-header',
              config.className?.header,
            )}
          >
            <div>
              <h2>{config.texts.title}</h2>
              <p>{config.texts.subtitle}</p>
            </div>
            <button
              type="button"
              className="lee-chat-close"
              aria-label="Close chat"
              onClick={leeChat.close}
            >
              ×
            </button>
          </header>
          <div
            className={mergeClassNames(
              'lee-chat-message-list',
              config.className?.messageList,
            )}
          >
            <ChatMessageList
              messages={chat.messages}
              renderMessage={(message) => (
                <article
                  className={mergeClassNames(
                    'lee-chat-message',
                    `lee-chat-message--${message.role}`,
                  )}
                >
                  <p>{message.content}</p>
                  {message.status === 'failed' ? (
                    <small>{config.texts.error}</small>
                  ) : null}
                </article>
              )}
            />
          </div>
          <div
            className={mergeClassNames(
              'lee-chat-composer',
              config.className?.composer,
            )}
          >
            <ChatComposer
              inputId={`${config.appId}-lee-chat-message`}
              label="Message"
              value={chat.inputValue}
              placeholder={config.texts.placeholder}
              submitLabel={chat.isSubmitting ? config.texts.sending : config.texts.send}
              isLoading={chat.isSubmitting}
              onChange={chat.setInputValue}
              onSubmit={() => {
                void chat.submitMessage()
              }}
            />
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className={mergeClassNames(
          'lee-chat-trigger',
          config.className?.trigger,
        )}
        aria-label={config.texts.triggerLabel}
        aria-expanded={leeChat.isOpen}
        onClick={leeChat.toggle}
      >
        <span>{config.texts.triggerLabel}</span>
        {leeChat.unreadCount > 0 ? (
          <strong className="lee-chat-unread">{leeChat.unreadCount}</strong>
        ) : null}
      </button>
    </div>
  )
}
