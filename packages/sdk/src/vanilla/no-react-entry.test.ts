import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vanilla entry', () => {
  it('React 런타임과 React 전용 디렉터리를 import하지 않는다', () => {
    const source = readFileSync(
      resolve(__dirname, 'init-lee-chat.ts'),
      'utf-8',
    )

    expect(source).not.toContain('react')
    expect(source).not.toContain('react-dom')
  })
})
