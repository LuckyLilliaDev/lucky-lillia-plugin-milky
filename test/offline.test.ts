import { Context } from 'cordis'
import { describe, expect, it, vi } from 'vitest'
import { MilkyAdapter } from '../src/adapter.js'

describe('NTQQ session expiration', () => {
  it.each(['qq/session-expired', 'nt/kicked-offline'] as const)('broadcasts the Milky bot_offline payload for %s', async (event) => {
    const ctx = new Context()
    ctx.provide('qqProtocol', { selfInfo: { uin: '123456', uid: 'test-uid', nick: 'TestBot', online: true } })
    const http = { broadcast: vi.fn() }
    const webhook = { broadcast: vi.fn() }
    const adapter = Object.assign(Object.create(MilkyAdapter.prototype) as MilkyAdapter, { ctx, httpHandler: http, webhookHandler: webhook })
    adapter['setupEventListeners']()
    const reason = 'Test authentication failure'
    if (event === 'qq/session-expired') await ctx.parallel(event, reason)
    else await ctx.parallel(event, { tipsDesc: reason, tipsTitle: 'Offline', kickedType: 1001 })
    expect(http.broadcast).toHaveBeenCalledTimes(1)
    expect(JSON.parse(http.broadcast.mock.calls[0][0])).toMatchObject({ self_id: 123456, event_type: 'bot_offline', data: { reason } })
    expect(webhook.broadcast).toHaveBeenCalledExactlyOnceWith(http.broadcast.mock.calls[0][0])
  })
})
