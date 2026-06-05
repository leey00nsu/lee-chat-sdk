import { describe, expect, it } from 'vitest'
import { createChatMessagePartFromAttachment } from './chat-attachment'

describe('chat attachment', () => {
  it('image upload result를 image message part로 변환한다', () => {
    expect(
      createChatMessagePartFromAttachment({
        kind: 'image',
        url: 'https://example.com/image.png',
        alt: 'Uploaded screenshot',
        width: 640,
        height: 480,
        mediaType: 'image/png',
      }),
    ).toEqual({
      type: 'image',
      url: 'https://example.com/image.png',
      alt: 'Uploaded screenshot',
      width: 640,
      height: 480,
      mediaType: 'image/png',
    })
  })

  it('file upload result를 file message part로 변환한다', () => {
    expect(
      createChatMessagePartFromAttachment({
        kind: 'file',
        url: 'https://example.com/report.pdf',
        name: 'report.pdf',
        size: 1024,
        mediaType: 'application/pdf',
      }),
    ).toEqual({
      type: 'file',
      url: 'https://example.com/report.pdf',
      name: 'report.pdf',
      size: 1024,
      mediaType: 'application/pdf',
    })
  })
})
