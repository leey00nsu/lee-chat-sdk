import type {
  ChatFileMessagePart,
  ChatImageMessagePart,
  ChatMessagePart,
} from './chat-message'

export type UploadedChatAttachment =
  | ({
      kind: 'image'
    } & Omit<ChatImageMessagePart, 'type'>)
  | ({
      kind: 'file'
    } & Omit<ChatFileMessagePart, 'type'>)

export function createChatMessagePartFromAttachment(
  attachment: UploadedChatAttachment,
): ChatMessagePart {
  if (attachment.kind === 'image') {
    const { kind: _kind, ...imagePart } = attachment

    return {
      type: 'image',
      ...imagePart,
    }
  }

  const { kind: _kind, ...filePart } = attachment

  return {
    type: 'file',
    ...filePart,
  }
}
