/**
 * 测试辅助函数和工具
 */

import path from 'pathe'

/**
 * 获取测试夹具目录的绝对路径
 */
export function getFixturePath(...segments: string[]): string {
  return path.resolve(__dirname, '../fixtures', ...segments)
}

/**
 * 创建模拟的插件选项
 */
export function createMockPluginOptions(overrides: Record<string, any> = {}) {
  return {
    root: path.resolve(__dirname, '../fixtures'),
    src: path.resolve(__dirname, '../fixtures/src'),
    pageDir: 'pages',
    subPackageDirs: [],
    excludePages: [],
    dts: false,
    debug: false,
    ...overrides,
  }
}

/**
 * 创建模拟的 Vue SFC 内容
 */
export function createMockVueSFC(scriptContent: string, isSetup = true): string {
  if (isSetup) {
    return `<script setup lang="ts">
${scriptContent}
</script>

<template>
  <view>Test Page</view>
</template>
`
  }

  return `<script lang="ts">
${scriptContent}
</script>

<template>
  <view>Test Page</view>
</template>
`
}

/**
 * 创建包含 definePageMeta 的 Vue SFC
 */
export function createPageWithMeta(meta: Record<string, any>): string {
  const metaString = JSON.stringify(meta, null, 2)
  return createMockVueSFC(`definePageMeta(${metaString})`)
}

/**
 * 规范化 JSON 字符串以便比较
 * 移除空白差异
 */
export function normalizeJson(json: string): string {
  return json
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

/**
 * 等待异步操作完成的辅助函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}