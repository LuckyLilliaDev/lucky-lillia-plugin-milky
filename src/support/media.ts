export function isFFmpegUnavailableError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'FFMPEG_PLUGIN_MISSING'
}
