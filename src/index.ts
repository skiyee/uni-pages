import type { PageMeta } from './types/macro'

// 核心导出
export { defineConfig } from './core/pages-config-file'
export { default } from './plugin'

// 全局类型声明
declare global {
  function definePageMeta(arg: PageMeta): void
}
