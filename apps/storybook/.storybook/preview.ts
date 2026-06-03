import type { Preview } from '@storybook/react-vite'
import 'lee-chat-sdk/style.css'
import '../src/storybook.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
}

export default preview
