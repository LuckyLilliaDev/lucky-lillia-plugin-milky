import { describe, expect, it, vi } from 'vitest'
import type { Context } from 'cordis'
import { unlink } from 'node:fs/promises'

vi.mock('../src/common/download.js', () => ({ resolveMilkyUri: async () => Buffer.from('mp3') }))
vi.mock('node:fs/promises', () => ({ writeFile: vi.fn(), unlink: vi.fn() }))
vi.mock('@luckylillia/plugin-nt-protocol/api', () => ({
  AtType: {},
  SendElement: {
    text: (text: string) => ({ text }),
    ptt: () => { throw Object.assign(new Error('请安装并启用 lucky-lillia-plugin-ffmpeg'), { code: 'FFMPEG_PLUGIN_MISSING' }) },
  },
}))
import { transformOutgoingMessage } from '../src/transform/message/outgoing.js'

describe('Milky optional media service', () => {
  it('returns the install instruction instead of silently dropping voice from a mixed message', async () => {
    const ctx = { logger: { error: vi.fn() } } as unknown as Context
    await expect(transformOutgoingMessage(ctx, [
      { type: 'text', data: { text: 'voice follows' } },
      { type: 'record', data: { uri: 'file:///voice.mp3' } },
    ], 'peer', false, false)).rejects.toThrow(/安装.*lucky-lillia-plugin-ffmpeg/)
    expect(ctx.logger.error).not.toHaveBeenCalled()
    expect(unlink).toHaveBeenCalledOnce()
  })
})
