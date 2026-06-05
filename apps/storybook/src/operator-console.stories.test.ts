import { describe, expect, it } from 'vitest'

describe('operator console stories', () => {
  it('운영 콘솔 상태별 story를 export한다', async () => {
    const stories = await import('./operator-console.stories')

    expect(stories.AssignedQueue).toBeDefined()
    expect(stories.UnassignedQueue).toBeDefined()
    expect(stories.ClosedConversation).toBeDefined()
    expect(stories.AssignedQueue.play).toBeTypeOf('function')
  })
})
