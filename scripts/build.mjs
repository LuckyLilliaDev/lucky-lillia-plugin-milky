import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'

// NTQQ's pure public helpers are bundled. Only the enabled NTQQ plugin creates
// services and loads native code; no second NTQQ installation is imported at runtime.
const shared = ['cordis', 'cosmokit', 'schemastery', '@luckylillia-dev/plugin-sdk', '@luckylillia-dev/plugin-sdk/*']
const backend = await build({
  entryPoints: ['src/index.ts'], outfile: 'lib/index.js', bundle: true, format: 'esm',
  platform: 'node', target: 'node22', sourcemap: true, metafile: true, external: shared,
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
})
const forbidden = Object.keys(backend.metafile.inputs).filter(file =>
  /(?:^|[/\\])(?:native|qqProtocol|direct-lib)(?:[/\\])/.test(file) || /LuckyLillia\.Bot[/\\]src/.test(file))
if (forbidden.length) throw new Error(`Milky must only bundle NTQQ public helpers: ${forbidden.join(', ')}`)
await build({
  entryPoints: ['src/client/index.tsx'], outfile: 'lib/client/index.js', bundle: true,
  format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/*', '@luckylillia-dev/plugin-sdk/webui'],
})
await mkdir('lib/types', { recursive: true })
await writeFile('lib/types/index.d.ts', `import type { Context, Schema } from '@luckylillia-dev/plugin-sdk'
export interface Config {
  reportSelfMessage: boolean
  http: { host: string; port: number; prefix: string; accessToken: string }
  webhook: { urls: string[]; accessToken: string }
}
export declare const Config: Schema<Config>
export declare const name: string
export declare const inject: string[]
export declare function apply(ctx: Context, config: Config): Promise<void>
`)
