import type {} from '@luckylillia/plugin-nt-protocol/contracts'
import type {} from '@luckylillia/plugin-sdk'
import { Context } from 'cordis'
import MilkyAdapter from './adapter.js'
import { Config, validateListener } from './settings.js'
import { prepareTempDir } from './support/temp.js'
import { installFFmpegBridge } from '@luckylillia/plugin-nt-protocol/api'

export { Config }
export const name = '@luckylillia/plugin-milky'
export const inject = MilkyAdapter.inject

export async function apply(ctx: Context, config: Config) {
  validateListener(config)
  installFFmpegBridge(ctx)
  await prepareTempDir()
  await ctx.plugin(MilkyAdapter, { ...config, webhook: { ...config.webhook, urls: config.webhook.urls.filter(url => url.trim()) } })
}
