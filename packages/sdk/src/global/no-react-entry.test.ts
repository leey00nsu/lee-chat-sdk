import { describe, expect, it } from 'vitest'

describe('global entry', () => {
  it('React 없이 drop-in API를 export한다', async () => {
    const globalEntry = await import('../global')

    expect(globalEntry.initLeeChat).toBeTypeOf('function')
    expect(globalEntry.openLeeChat).toBeTypeOf('function')
    expect(globalEntry.closeLeeChat).toBeTypeOf('function')
    expect(globalEntry.destroyLeeChat).toBeTypeOf('function')
    expect(globalEntry.SseChatEventTransport).toBeTypeOf('function')
    expect(globalEntry.WebSocketChatEventTransport).toBeTypeOf('function')
  })
})
