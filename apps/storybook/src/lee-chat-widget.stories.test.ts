import { describe, expect, it } from 'vitest'

describe('lee chat widget stories', () => {
  it('주요 위젯 상태 story와 interaction play를 export한다', async () => {
    const stories = await import('./lee-chat-widget.stories')

    expect(stories.Default).toBeDefined()
    expect(stories.InitialOpen).toBeDefined()
    expect(stories.LongMessages).toBeDefined()
    expect(stories.Sending).toBeDefined()
    expect(stories.FailedWithRetry).toBeDefined()
    expect(stories.ParticipantState).toBeDefined()
    expect(stories.CustomTheme).toBeDefined()
    expect(stories.BottomLeft).toBeDefined()
    expect(stories.CustomRender).toBeDefined()
    expect(stories.Default.play).toBeTypeOf('function')
  })
})
