import { createRoot } from 'react-dom/client'
import { OperatorConsoleApp } from './ui/operator-console-app'

const rootElement = document.querySelector('#root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(<OperatorConsoleApp />)
