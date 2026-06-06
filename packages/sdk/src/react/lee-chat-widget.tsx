'use client'

import * as Popover from '@radix-ui/react-popover'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { ChatMessage, ChatMessagePart } from '../model/chat-message'
import type { UploadedChatAttachment } from '../model/chat-attachment'
import { ChatComposer } from '../ui/chat-composer'
import { ChatMessageList } from '../ui/chat-message-list'
import { useLeeChat } from './use-lee-chat'
import '../style/lee-chat-widget.css'

export interface LeeChatWidgetMessageRenderParams<
  TMessageMetadata = Record<string, unknown>,
> {
  message: ChatMessage<TMessageMetadata>
  retryMessage: (messageId: string) => void
}

export interface LeeChatWidgetAssistantContentRenderParams<
  TMessageMetadata = Record<string, unknown>,
> {
  message: ChatMessage<TMessageMetadata>
  defaultContent: ReactNode
}

export interface LeeChatWidgetMessageFooterRenderParams<
  TMessageMetadata = Record<string, unknown>,
> {
  message: ChatMessage<TMessageMetadata>
}

export interface LeeChatWidgetHeaderRenderParams {
  title: string
  subtitle: string
  isOpen: boolean
  hasOnlineParticipant: boolean
  close: () => void
}

export interface LeeChatWidgetTriggerRenderParams {
  label: string
  isOpen: boolean
  unreadCount: number
  open: () => void
  close: () => void
  toggle: () => void
}

export interface LeeChatWidgetComposerFooterRenderParams {
  isSubmitting: boolean
  inputValue: string
}

export interface LeeChatWidgetProps<
  TMessageMetadata = Record<string, unknown>,
> {
  uploadAttachment?: (file: File) => Promise<UploadedChatAttachment>
  renderHeader?: (params: LeeChatWidgetHeaderRenderParams) => ReactNode
  renderMessage?: (
    params: LeeChatWidgetMessageRenderParams<TMessageMetadata>,
  ) => ReactNode
  renderAssistantContent?: (
    params: LeeChatWidgetAssistantContentRenderParams<TMessageMetadata>,
  ) => ReactNode
  renderMessageFooter?: (
    params: LeeChatWidgetMessageFooterRenderParams<TMessageMetadata>,
  ) => ReactNode
  renderAssistantLoading?: () => ReactNode
  renderComposerFooter?: (
    params: LeeChatWidgetComposerFooterRenderParams,
  ) => ReactNode
  renderTrigger?: (params: LeeChatWidgetTriggerRenderParams) => ReactNode
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

export function LeeChatWidget<
  TMessageMetadata = Record<string, unknown>,
>({
  uploadAttachment,
  renderHeader,
  renderMessage,
  renderAssistantContent,
  renderMessageFooter,
  renderAssistantLoading,
  renderComposerFooter,
  renderTrigger,
}: LeeChatWidgetProps<TMessageMetadata> = {}) {
  const leeChat = useLeeChat<TMessageMetadata>()
  const { config, chat } = leeChat
  const latestMessageAnchorRef = useRef<HTMLDivElement>(null)
  const hasOnlineParticipant = leeChat.participantState.presences.some(
    (presence) => {
      return (
        presence.participantId !== config.participant.id &&
        presence.status === 'online'
      )
    },
  )
  const hasTypingParticipant = leeChat.participantState.typingIndicators.some(
    (typingIndicator) => {
      return (
        typingIndicator.conversationId === config.conversation.id &&
        typingIndicator.participantId !== config.participant.id &&
        typingIndicator.isTyping
      )
    },
  )

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

  function handleToggle(): void {
    if (leeChat.isOpen) {
      leeChat.close()
      return
    }

    leeChat.open()
  }

  function isMessageReadByAnotherParticipant(
    message: ChatMessage<TMessageMetadata>,
  ): boolean {
    if (message.senderId !== config.participant.id) {
      return false
    }

    return leeChat.participantState.readReceipts.some((readReceipt) => {
      return (
        readReceipt.conversationId === message.conversationId &&
        readReceipt.messageId === message.id &&
        readReceipt.participantId !== config.participant.id
      )
    })
  }

  function renderDefaultMessage(
    message: ChatMessage<TMessageMetadata>,
  ): ReactNode {
    const defaultContent = renderDefaultMessageContent(message)

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
        {(message.role === 'assistant' || message.role === 'agent') &&
        renderAssistantContent
          ? renderAssistantContent({
              message,
              defaultContent,
            })
          : defaultContent}
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
        {isMessageReadByAnotherParticipant(message) ? (
          <small
            className={mergeClassNames(
              'lee-chat-read-receipt',
              config.className?.readReceipt,
            )}
          >
            {config.texts.messageRead}
          </small>
        ) : null}
        {renderMessageFooter?.({
          message,
        })}
      </article>
    )
  }

  function renderDefaultMessageContent(
    message: ChatMessage<TMessageMetadata>,
  ): ReactNode {
    return message.parts.map((part, index) => {
      return renderMessagePart(part, index)
    })
  }

  function renderMessagePart(part: ChatMessagePart, index: number): ReactNode {
    if (part.type === 'image') {
      return (
        <img
          key={`${part.type}-${part.url}-${index}`}
          className="lee-chat-message-image"
          src={part.url}
          alt={part.alt ?? ''}
          width={part.width}
          height={part.height}
        />
      )
    }

    if (part.type === 'file') {
      return (
        <a
          key={`${part.type}-${part.url}-${index}`}
          className="lee-chat-message-file"
          href={part.url}
          target="_blank"
          rel="noreferrer"
        >
          {part.name}
        </a>
      )
    }

    return <p key={`${part.type}-${index}`}>{part.text}</p>
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

  function renderDefaultHeader(): ReactNode {
    return (
      <>
        <div>
          <h2>{config.texts.title}</h2>
          <p>{config.texts.subtitle}</p>
          {hasOnlineParticipant ? (
            <small
              className={mergeClassNames(
                'lee-chat-participant-status',
                config.className?.participantStatus,
              )}
            >
              {config.texts.participantOnline}
            </small>
          ) : null}
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
      </>
    )
  }

  function renderDefaultTrigger(): ReactNode {
    return (
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
    )
  }

  return (
    <Popover.Root open={leeChat.isOpen} onOpenChange={handleOpenChange}>
      <div
        data-testid="lee-chat-root"
        style={{
          '--lee-chat-primary': config.theme.primaryColor,
          '--lee-chat-radius': config.theme.radius,
        } as CSSProperties}
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
              {renderHeader
                ? renderHeader({
                    title: config.texts.title,
                    subtitle: config.texts.subtitle,
                    isOpen: leeChat.isOpen,
                    hasOnlineParticipant,
                    close: leeChat.close,
                  })
                : renderDefaultHeader()}
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
              {chat.isSubmitting ? (
                <div className="lee-chat-message-list-status">
                  {renderAssistantLoading
                    ? renderAssistantLoading()
                    : renderDefaultAssistantLoading()}
                </div>
              ) : null}
              {hasTypingParticipant ? (
                <p
                  className={mergeClassNames(
                    'lee-chat-typing-indicator',
                    config.className?.typingIndicator,
                  )}
                  role="status"
                >
                  {config.texts.participantTyping}
                </p>
              ) : null}
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
                uploadAttachment={
                  config.features.attachments ? uploadAttachment : undefined
                }
                onChange={chat.setInputValue}
                onSubmit={(parts) => {
                  void chat.submitMessage(undefined, parts)
                }}
              />
              {renderComposerFooter
                ? renderComposerFooter({
                    isSubmitting: chat.isSubmitting,
                    inputValue: chat.inputValue,
                  })
                : null}
            </div>
          </section>
        </Popover.Content>

        <Popover.Trigger asChild>
          {renderTrigger
            ? renderTrigger({
                label: config.texts.triggerLabel,
                isOpen: leeChat.isOpen,
                unreadCount: leeChat.unreadCount,
                open: leeChat.open,
                close: leeChat.close,
                toggle: handleToggle,
              })
            : renderDefaultTrigger()}
        </Popover.Trigger>
      </div>
    </Popover.Root>
  )
}
