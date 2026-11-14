import Schema from 'schemastery'

export interface MilkyHttpConfig {
  host: string
  port: number
  prefix: string
  accessToken: string
}

export interface MilkyWebhookConfig {
  urls: string[]
  accessToken: string
}

export interface Config {
  reportSelfMessage: boolean
  http: MilkyHttpConfig
  webhook: MilkyWebhookConfig
}
export type MilkyConfig = Config

export const Config: Schema<Config> = Schema.object({
  reportSelfMessage: Schema.boolean().default(false).description('上报自己发送的消息'),
  http: Schema.object({
    host: Schema.string().role('host').default('127.0.0.1').description('监听地址（留空 = 监听全部地址）'),
    port: Schema.natural().min(1).max(65535).default(3010).description('HTTP 端口'),
    prefix: Schema.string().default('').description('路径前缀：HTTP API 路径前缀（可选）'),
    accessToken: Schema.string().role('secret').default('').description('Access Token：用于 Milky HTTP 连接验证'),
  }).description('HTTP 配置'),
  webhook: Schema.object({
    urls: Schema.array(Schema.string().pattern(/^(?:https?:\/\/|\s*$)/)).default([]).description('Webhook URLs：事件上报的地址'),
    accessToken: Schema.string().role('secret').default('').description('Access Token：用于 Webhook 请求验证'),
  }).description('Webhook 配置'),
}) as Schema<Config>

/** Check again on every start, including reloads and hand-edited configuration files. */
export function validateListener(config: Config): void {
  const { host, accessToken } = config.http
  if ((!host || host === '0.0.0.0' || host === '::') && !accessToken) {
    throw new Error('Milky HTTP 监听全部地址时必须设置 Token')
  }
}
