'use client'

import * as Popover from '@radix-ui/react-popover'
import { useEffect, useRef, type ReactNode } from 'react'
import { getChatMessageText, type ChatMessage } from '../model/chat-message'
import { ChatComposer } from '../ui/chat-composer'
import { ChatMessageList } from '../ui/chat-message-list'
import { useLeeChat } from './use-lee-chat'
import './lee-chat-widget.css'

export interface LeeChatWidgetMessageRenderParams {
  message: ChatMessage<Record<string, unknown>>
  retryMessage: (messageId: string) => void
}

export interface LeeChatWidgetProps {
  renderMessage?: (params: LeeChatWidgetMessageRenderParams) => ReactNode
  renderAssistantLoading?: () => ReactNode
}

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function resolvePositionClassName(position: string): string {
  return position === 'bottom-left'
    ? 'lee-chat-root--bottom-left'
    : 'lee-chat-root--bottom-right'
}

function resolvePopoverAlign(position: string): 'start' | 'end' {
  return position === 'bottom-left' ? 'start' : 'end'
}

export function LeeChatWidget({
  renderMessage,
  renderAssistantLoading,
}: LeeChatWidgetProps = {}) {
  const leeChat = useLeeChat()
  const { config, chat } = leeChat
  const latestMessageAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rootStyle = document.documentElement.style
    rootStyle.setProperty('--lee-chat-primary', config.theme.primaryColor)
    rootStyle.setProperty('--lee-chat-radius', config.theme.radius)
  }, [config.theme.primaryColor, config.theme.radius])

  useEffect(() => {
    if (!leeChat.isOpen) {
      return
    }

    scrollLatestMessageIntoView()
  }, [chat.messages.length, leeChat.isOpen])

  function scrollLatestMessageIntoView(): void {
    if (typeof latestMessageAnchorRef.current?.scrollIntoView !== 'function') {
      return
    }

    latestMessageAnchorRef.current.scrollIntoView({
      block: 'end',
    })
  }

  function handleOpenChange(nextIsOpen: boolean): void {
    if (nextIsOpen) {
      leeChat.open()
      return
    }

    leeChat.close()
  }

  function handleRetryMessage(messageId: string): void {
    void chat.retryMessage(messageId)
  }

  function renderDefaultMessage(
    message: ChatMessage<Record<string, unknown>>,
  ): ReactNode {
    return (
      <article
        className={mergeClassNames(
          'lee-chat-message',
          `lee-chat-message--${message.role}`,
          `lee-chat-message--${message.status}`,
          config.className?.message,
        )}
        data-status={message.status}
      >
        <p>{getChatMessageText(message)}</p>
        {message.status === 'sending' ? (
          <small
            className={mergeClassNames(
              'lee-chat-message-status',
              config.className?.messageStatus,
            )}
          >
            {config.texts.messageSending}
          </small>
        ) : null}
        {message.status === 'failed' ? (
          <div
            className={mergeClassNames(
              'lee-chat-message-status',
              config.className?.messageStatus,
            )}
          >
            <small>{config.texts.error}</small>
            <button
              type="button"
              className={mergeClassNames(
                'lee-chat-retry',
                config.className?.retryButton,
              )}
              onClick={() => handleRetryMessage(message.id)}
            >
              {config.texts.retry}
            </button>
          </div>
        ) : null}
      </article>
    )
  }

  function renderDefaultAssistantLoading(): ReactNode {
    return (
      <article
        className={mergeClassNames(
          'lee-chat-message',
          'lee-chat-message--assistant',
          'lee-chat-message--loading',
          'lee-chat-assistant-loading',
          config.className?.assistantLoading,
        )}
        role="status"
      >
        <p>{config.texts.assistantLoading}</p>
      </article>
    )
  }

  return (
    <Popover.Root open={leeChat.isOpen} onOpenChange={handleOpenChange}>
      <div
        data-testid="lee-chat-root"
        className={mergeClassNames(
          'lee-chat-root',
          resolvePositionClassName(config.position),
          config.className?.root,
        )}
      >
        <Popover.Content
          align={resolvePopoverAlign(config.position)}
          asChild
          onOpenAutoFocus={scrollLatestMessageIntoView}
          side="top"
          sideOffset={12}
        >
          <section
            aria-label={config.texts.title}
            role="region"
            className={mergeClassNames(
              'lee-chat-panel',
              config.className?.panel,
            )}
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
              <Popover.Close asChild>
                <button
                  type="button"
                  className="lee-chat-close"
                  aria-label="Close chat"
                >
                  ×
                </button>
              </Popover.Close>
            </header>
            <div
              className={mergeClassNames(
                'lee-chat-message-list',
                config.className?.messageList,
              )}
              aria-live="polite"
            >
              <ChatMessageList
                messages={chat.messages}
                renderMessage={(message) => (
                  <>
                    {renderMessage
                      ? renderMessage({
                          message,
                          retryMessage: handleRetryMessage,
                        })
                      : renderDefaultMessage(message)}
                  </>
                )}
              />
              {chat.isSubmitting
                ? renderAssistantLoading
                  ? renderAssistantLoading()
                  : renderDefaultAssistantLoading()
                : null}
              <div
                aria-hidden="true"
                className="lee-chat-scroll-anchor"
                ref={latestMessageAnchorRef}
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
                submitLabel={
                  chat.isSubmitting ? config.texts.sending : config.texts.send
                }
                isLoading={chat.isSubmitting}
                onChange={chat.setInputValue}
                onSubmit={() => {
                  void chat.submitMessage()
                }}
              />
            </div>
          </section>
        </Popover.Content>

        <Popover.Trigger asChild>
          <button
            type="button"
            className={mergeClassNames(
              'lee-chat-trigger',
              config.className?.trigger,
            )}
            aria-label={config.texts.triggerLabel}
          >
            <span>{config.texts.triggerLabel}</span>
            {leeChat.unreadCount > 0 ? (
              <strong className="lee-chat-unread">{leeChat.unreadCount}</strong>
            ) : null}
          </button>
        </Popover.Trigger>
      </div>
    </Popover.Root>
  )
}
