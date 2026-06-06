'use client'

import { useContext } from 'react'
import {
  LeeChatContext,
  type LeeChatContextValue,
} from './lee-chat-context'

export function useLeeChat<
  TMessageMetadata = Record<string, unknown>,
>(): LeeChatContextValue<TMessageMetadata> {
  const context = useContext(LeeChatContext)

  if (!context) {
    throw new Error('useLeeChat must be used within LeeChatProvider')
  }

  return context as LeeChatContextValue<TMessageMetadata>
}
