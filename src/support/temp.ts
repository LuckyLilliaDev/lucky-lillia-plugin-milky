import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const TEMP_DIR = path.join(tmpdir(), 'lucky-lillia-milky')
export async function prepareTempDir(): Promise<void> {
  await mkdir(TEMP_DIR, { recursive: true })
}
