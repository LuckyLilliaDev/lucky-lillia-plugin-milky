import { describe, expect, it, vi } from 'vitest'
import type { Context } from 'cordis'
import { AtType, ChatType, ElementType, type RawMessage } from '@luckylillia/plugin-nt-protocol/api'
import { transformIncomingSegments } from '../src/transform/message/incoming.js'

const message = (elements: unknown[]) => ({ chatType: ChatType.Group, peerUid: '12345', elements }) as RawMessage

describe('incoming NTQQ messages through the public plugin contract', () => {
  it('keeps text, mentions and faces in message order', async () => {
    expect(await transformIncomingSegments({} as Context, message([
      { elementType: ElementType.Text, textElement: { content: '你好', atType: AtType.Unknown } },
      { elementType: ElementType.Text, textElement: { content: '@全体成员', atType: AtType.All } },
      { elementType: ElementType.Text, textElement: { content: '@用户', atType: AtType.One, atUin: 123 } },
      { elementType: ElementType.Face, faceElement: { faceIndex: 178, faceType: 3 } },
    ]))).toEqual([
      { type: 'text', data: { text: '你好' } },
      { type: 'mention_all', data: {} },
      { type: 'mention', data: { user_id: 123, name: '用户' } },
      { type: 'face', data: { face_id: '178', is_large: true } },
    ])
  })

  it('gets image URLs from the enabled NTQQ service', async () => {
    const getImageUrl = vi.fn(async () => 'https://example.test/image')
    const ctx = { ntFileApi: { getImageUrl } } as unknown as Context
    expect(await transformIncomingSegments(ctx, message([{
      elementType: ElementType.Pic, picElement: { fileUuid: 'image-id', originImageUrl: 'origin', md5HexStr: 'digest',
        picWidth: 100, picHeight: 80, picSubType: 1, summary: '图片说明' },
    }]))).toEqual([{ type: 'image', data: { resource_id: 'image-id', temp_url: 'https://example.test/image',
      width: 100, height: 80, summary: '图片说明', sub_type: 'sticker' } }])
    expect(getImageUrl).toHaveBeenCalledWith('origin', 'digest', { fileUuid: 'image-id', isGroup: true, peerUid: '12345' })
  })

  it('resolves an uncached reply through the NTQQ message service', async () => {
    const quoted = message([{ elementType: ElementType.Text, textElement: { content: '原消息', atType: AtType.Unknown } }])
    const getSingleMsg = vi.fn(async () => ({ msgList: [quoted] }))
    const ctx = { store: { getMsgBySeq: vi.fn(() => undefined) }, ntMsgApi: { getSingleMsg } } as unknown as Context
    expect(await transformIncomingSegments(ctx, message([{ elementType: ElementType.Reply,
      replyElement: { replyMsgSeq: 42, senderUin: 123, replyMsgTime: 100, replyMsgClientSeq: 7 },
    }]))).toEqual([{ type: 'reply', data: { message_seq: 42, sender_id: 123, time: 100,
      segments: [{ type: 'text', data: { text: '原消息' } }] } }])
    expect(getSingleMsg).toHaveBeenCalledWith({ chatType: ChatType.Group, peerUid: '12345' }, 42)
  })
})
