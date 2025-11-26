import type { PageMetaInput } from './types/macro'

export { defineConfig } from './core/pages-config-file'
export { default } from './plugin'

declare global {
  function definePageMeta(arg: PageMetaInput): void
}
