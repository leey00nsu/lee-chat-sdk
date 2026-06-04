import { describe, expect, it } from 'vitest'

describe('integration guide stories', () => {
  it('SDK 설치와 연동 guide story를 export한다', async () => {
    const stories = await import('./integration-guide.stories')

    expect(stories.EmbeddingGuide).toBeDefined()
  })
})
