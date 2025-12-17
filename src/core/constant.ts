/**
 * 所有支持的平台标识符常量
 *
 * 包含 uni-app 支持的所有平台以及特殊的 `default` 关键字
 */
export const PLATFORMS = [
  'app-plus',
  'app-nvue',
  'h5',
  'web',
  'mp',
  'mp-weixin',
  'mp-alipay',
  'mp-baidu',
  'mp-toutiao',
  'mp-lark',
  'mp-qq',
  'mp-kuaishou',
  'mp-jd',
  'mp-360',
  'quickapp-webview',
  'quickapp-webview-union',
  'quickapp-webview-huawei',
  'default',
] as const

/**
 * 所有支持的平台标识符集合
 *
 * @example
 * ```typescript
 * if (PLATFORMS_SET.has('mp-weixin')) {
 *   console.log('mp-weixin 是有效的平台标识符')
 * }
 * ```
 */
export const PLATFORMS_SET = new Set(PLATFORMS)
