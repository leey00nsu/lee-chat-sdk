'use client'

import { useContext } from 'react'
import { LeeChatContext } from './lee-chat-context'

export function useLeeChat() {
  const context = useContext(LeeChatContext)

  if (!context) {
    throw new Error('useLeeChat must be used within LeeChatProvider')
  }

  return context
}
