import { createRoot } from 'react-dom/client'
import 'lee-chat-sdk/style.css'
import { SupportChatDemo } from './ui/support-chat-demo'

const rootElement = document.querySelector('#root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(<SupportChatDemo />)
