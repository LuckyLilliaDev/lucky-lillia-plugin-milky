import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context, FiberState } from 'cordis'
import { createServer } from 'node:net'
import { MilkyHttpHandler } from '../src/network/http.js'
import type { MilkyAdapter } from '../src/adapter.js'
import { Config, validateListener } from '../src/settings.js'
import * as plugin from '../src/index.js'

const handlers: MilkyHttpHandler[] = []
const ctx = new Context()
const fakeAdapter = { apiCollection: { hasApi: () => true, handle: async () => ({ status: 'ok', retcode: 0, data: {} }) } } as unknown as MilkyAdapter

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as { port: number }).port
  await new Promise<void>(resolve => server.close(() => resolve()))
  return port
}

function handler(port: number) {
  const h = new MilkyHttpHandler(fakeAdapter, ctx, { host: '127.0.0.1', port, prefix: '', accessToken: 'test-token' })
  handlers.push(h)
  return h
}

afterEach(async () => {
  await Promise.all(handlers.splice(0).map(h => h.stop()))
})

describe('Milky standalone adapter lifecycle', () => {
  it('waits for NTQQ services and resumes after login without restarting the host', async () => {
    const scope = new Context()
    const port = await freePort()
    const mounted = scope.plugin(plugin, { http: { port } })
    try {
      expect(mounted.ctx.fiber.state).toBe(FiberState.PENDING)
      for (const name of plugin.inject) {
        scope.provide(name, name === 'qqProtocol' ? { selfInfo: { uin: '123456', uid: 'test', online: true } } : {})
      }
      await vi.waitFor(() => expect(mounted.ctx.fiber.state).toBe(FiberState.ACTIVE))
      const response = await fetch(`http://127.0.0.1:${port}/api/missing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      expect(response.status).toBe(404)
    } finally {
      await scope.fiber.dispose()
    }
    await handler(port).start()
  })

  it('awaits port release so an update can bind the same address immediately', async () => {
    const port = await freePort()
    const first = handler(port)
    await first.start()
    expect((await fetch(`http://127.0.0.1:${port}/api/get_login_info`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).status).toBe(401)
    await first.stop()
    const replacement = handler(port)
    await replacement.start()
    const result = await fetch(`http://127.0.0.1:${port}/api/get_login_info`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: '{}',
    })
    expect(await result.json()).toEqual({ status: 'ok', retcode: 0, data: {} })
  })

  it('reports a startup bind failure instead of leaving an apparently active plugin', async () => {
    const port = await freePort()
    await handler(port).start()
    await expect(handler(port).start()).rejects.toMatchObject({ code: 'EADDRINUSE' })
  })

  it('requires a token before a public listener starts', () => {
    const config = Config({})
    expect(() => validateListener(config)).not.toThrow()
    config.http.host = ''
    expect(() => validateListener(config)).toThrow('必须设置 Token')
    config.http.accessToken = 'test-token'
    expect(() => validateListener(config)).not.toThrow()
  })
})
