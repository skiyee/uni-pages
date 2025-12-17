import type { PLATFORMS } from '../core/constant'

/**
 * 从 PLATFORMS 常量推导的平台类型
 *
 * 使用 `typeof PLATFORMS[number]` 确保类型与常量保持同步
 */
export type Platform = typeof PLATFORMS[number]

/**
 * 平台值对象类型
 *
 * 键为平台条件，值为对应的配置。
 * 用于定义针对不同平台的差异化配置。
 *
 * 特性：
 * - 支持单平台键（如 'mp-weixin'）的完整类型提示
 * - 支持多平台（如 'mp-weixin || mp-alipay'）及以上的自定义组合（无类型提示但允许使用）
 *
 * @template T 配置值的类型
 *
 * @example
 * ```typescript
 * const navigationTitle: PlatformValue<string> = {
 *   'mp-weixin': 'Hello 微信',
 *   'h5': 'Hello H5',
 *   'default': 'Hello App',
 * }
 *
 * // 组合语法 - 现在有完整的类型提示！
 * const backgroundColor: PlatformValue<string> = {
 *   'mp-weixin || mp-alipay': '#FFFFFF',  // ✅ 有类型提示
 *   'h5': '#F8F8F8',
 *   'default': '#EEEEEE',
 * }
 * ```
 */
export type PlatformValue<T> = {
  [K in Platform]?: T
} & {
  [key: string]: T;
}
