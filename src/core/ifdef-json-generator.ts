import type { CommentToken } from 'comment-json'

import type { Platform, PlatformValue } from '../types/ifdef'

import { stringify as commentStringify } from 'comment-json'

import { ConditionResolver } from './condition-resolver'
import { PLATFORMS_SET } from './constant'

/**
 * 条件编译 JSON 生成器
 *
 * @example
 * ```typescript
 * import { IfdefJsonGenerator } from './ifdef-json-generator'
 *
 * const generator = new IfdefJsonGenerator()
 *
 * const config = {
 *   path: 'pages/index/index',
 *   style: {
 *     navigationBarTitleText: {
 *       'mp-weixin': 'Hello 微信',
 *       'h5': 'Hello H5',
 *       'default': 'Hello App',
 *     },
 *   },
 * }
 *
 * const json = generator.generate(config)
 * // 输出带有 #ifdef/#ifndef/#endif 注释的 JSON
 * ```
 */
export class IfdefJsonGenerator {
  /** 用于生成唯一后缀的计数器 */
  private suffixCounter = 0

  /**
   * 将包含 $ifdef 值的对象转换为带条件编译注释的 JSON 字符串
   *
   * @param obj 源对象（可能包含 IfdefValue）
   * @param indent 缩进字符串，默认 4 空格
   * @param eof 文件结尾字符，默认换行
   * @returns 带条件编译注释的 JSON 字符串
   *
   * @example
   * ```typescript
   * const generator = new IfdefJsonGenerator()
   * const json = generator.generate({ title: { 'h5': 'Web', 'default': 'App' } })
   * ```
   */
  generate(obj: object, indent: string = '    ', eof: string = '\n'): string {
    // 重置计数器
    this.suffixCounter = 0

    // 深度处理对象，展开所有 IfdefValue
    const processedObj = this.processObject(obj)

    // 生成带注释的 JSON
    let rawJson = commentStringify(processedObj, null, indent)

    // 清理 key 后缀（移除 #ifdef_ 标记）
    rawJson = rawJson.replace(/"([^"]+)#ifdef_[^"]*"/g, '"$1"')

    // 修复 #ifdef/#ifndef 行注释位置
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    rawJson = rawJson.replace(/\n(\s*.+)\s*(\/\/ #ifn?def .*)\n(\s*)/g, '\n$1\n$3$2\n$3')

    // 修复 #endif 行注释位置
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    rawJson = rawJson.replace(/\n((\s*).*?)\s*\/\/ #endif/g, '\n$1\n$2// #endif')

    // 清除多余的换行
    rawJson = rawJson.replace(/\n\s*\n/g, '\n')

    return rawJson + eof
  }

  /**
   * 深度处理对象，将 IfdefValue 展开为带条件编译注释的属性
   *
   * @param obj 要处理的对象
   * @returns 处理后的对象（包含展开的条件编译属性和注释）
   */
  private processObject(obj: object): object {
    if (Array.isArray(obj)) {
      return this.processArray(obj)
    }

    const result: Record<string | symbol, unknown> = {}

    for (const key of Object.keys(obj)) {
      const value = (obj as Record<string, unknown>)[key]

      if (this.isPlatformValue(value)) {
        // 展开 PlatformValue 为多个带条件编译注释的属性
        this.expandIfdefValue(result, key, value as PlatformValue<unknown>)
      }
      else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        result[key] = this.processObject(value as object)
      }
      else {
        // 普通值直接复制
        result[key] = value
      }
    }

    // 复制 Symbol 属性（如已有的注释）
    for (const sym of Object.getOwnPropertySymbols(obj)) {
      result[sym] = (obj as Record<symbol, unknown>)[sym]
    }

    return result
  }

  /**
   * 处理数组，递归处理数组中的每个元素
   *
   * @param arr 要处理的数组
   * @returns 处理后的数组
   */
  private processArray(arr: unknown[]): unknown[] {
    return arr.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return this.processObject(item as object)
      }
      return item
    })
  }

  /**
   * 展开 PlatformValue 为多个带条件编译注释的属性
   *
   * 使用 ConditionResolver 解决条件冲突，确保每个平台只匹配一个最具体的条件。
   *
   * @param result 目标对象
   * @param key 原始属性键
   * @param conditions 平台值对象
   *
   * @example
   * 输入:
   * ```typescript
   * {
   *   'h5': 'uni-app H5',
   *   'mp-weixin || app-plus': 'uniapp',
   *   'mp-weixin': 'uni-app 小程序',
   * }
   * ```
   *
   * 输出（JSON 注释）:
   * ```json
   * // #ifdef H5
   * "navigationBarTitleText": "uni-app H5",
   * // #endif
   * // #ifdef APP-PLUS
   * "navigationBarTitleText": "uniapp",
   * // #endif
   * // #ifdef MP-WEIXIN
   * "navigationBarTitleText": "uni-app 小程序",
   * // #endif
   * ```
   */
  private expandIfdefValue(
    result: Record<string | symbol, unknown>,
    key: string,
    conditions: PlatformValue<unknown>,
  ): void {
    // 使用 ConditionResolver 解析并解决冲突
    const resolver = new ConditionResolver()
    const resolveResult = resolver.resolve(conditions)

    // 处理解决后的条件列表，生成 #ifdef 块
    for (const resolved of resolveResult.conditions) {
      // 生成唯一的属性键后缀
      const suffix = this.generateSuffix()
      const propertyKey = `${key}#ifdef_${suffix}`

      // 处理值（如果是对象则递归处理）
      const processedValue = typeof resolved.value === 'object' && resolved.value !== null
        ? this.processObject(resolved.value as object)
        : resolved.value

      result[propertyKey] = processedValue

      // 生成 #ifdef 注释（条件已经是大写格式）
      this.wrapIfdef(result, propertyKey, resolved.condition)
    }

    // 处理 default 条件，生成 #ifndef 块
    if (resolveResult.defaultCondition) {
      const suffix = this.generateSuffix()
      const propertyKey = `${key}#ifdef_${suffix}`

      // 处理 default 值
      const processedValue = typeof resolveResult.defaultCondition.value === 'object'
        && resolveResult.defaultCondition.value !== null
        ? this.processObject(resolveResult.defaultCondition.value as object)
        : resolveResult.defaultCondition.value

      result[propertyKey] = processedValue

      // 使用 excludedPlatforms 生成 #ifndef 条件
      const excludedPlatforms = [...resolveResult.defaultCondition.excludedPlatforms]
        .map(p => p.toUpperCase())
        .sort()
      const ifndefCondition = excludedPlatforms.join(' || ')
      this.wrapIfndef(result, propertyKey, ifndefCondition)
    }
  }

  /**
   * 解析平台条件字符串
   *
   * 将如 `'mp-weixin || mp-alipay'` 的条件字符串解析为大写的平台数组 `['MP-WEIXIN', 'MP-ALIPAY']`
   *
   * @param condition 条件字符串
   * @returns 大写的平台名称数组
   *
   * @example
   * ```typescript
   * parsePlatformCondition('mp-weixin') // ['MP-WEIXIN']
   * parsePlatformCondition('mp-weixin || mp-alipay') // ['MP-WEIXIN', 'MP-ALIPAY']
   * ```
   */
  private parsePlatformCondition(condition: string): string[] {
    return condition
      .split('||')
      .map(p => p.trim().toUpperCase())
      .filter(p => p.length > 0)
  }

  /**
   * 生成 #ifndef 条件字符串
   *
   * 将所有非 default 的平台条件合并为 #ifndef 条件
   *
   * @param allConditions 所有非 default 的平台条件（已大写）
   * @returns #ifndef 条件字符串
   *
   * @example
   * ```typescript
   * generateIfndef(['MP-WEIXIN', 'H5']) // 'MP-WEIXIN || H5'
   * ```
   */
  private generateIfndef(allConditions: string[]): string {
    // 去重并排序，确保输出稳定
    const uniqueConditions = [...new Set(allConditions)].sort()
    return uniqueConditions.join(' || ')
  }

  /**
   * 为属性添加 #ifdef 条件编译注释
   *
   * @param obj 目标对象
   * @param key 属性键
   * @param platform 平台条件字符串（已大写，如 'MP-WEIXIN' 或 'MP-WEIXIN || MP-ALIPAY'）
   */
  private wrapIfdef(obj: Record<string | symbol, unknown>, key: string, platform: string): void {
    obj[Symbol.for(`before:${key}`)] = [{
      type: 'LineComment',
      value: ` #ifdef ${platform}`,
      inline: true,
      loc: {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 },
      },
    }] as CommentToken[]

    obj[Symbol.for(`after:${key}`)] = [{
      type: 'LineComment',
      value: ` #endif`,
      inline: true,
      loc: {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 },
      },
    }] as CommentToken[]
  }

  /**
   * 为属性添加 #ifndef 条件编译注释
   *
   * @param obj 目标对象
   * @param key 属性键
   * @param condition #ifndef 条件字符串（如 'MP-WEIXIN || H5'）
   */
  private wrapIfndef(obj: Record<string | symbol, unknown>, key: string, condition: string): void {
    obj[Symbol.for(`before:${key}`)] = [{
      type: 'LineComment',
      value: ` #ifndef ${condition}`,
      inline: true,
      loc: {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 },
      },
    }] as CommentToken[]

    obj[Symbol.for(`after:${key}`)] = [{
      type: 'LineComment',
      value: ` #endif`,
      inline: true,
      loc: {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 },
      },
    }] as CommentToken[]
  }

  /**
   * 生成唯一的后缀标识符
   *
   * @returns 唯一后缀字符串
   */
  private generateSuffix(): string {
    return `${Date.now()}_${++this.suffixCounter}`
  }

  /**
   * 检测是否为平台值对象
   *
   * 判断规则：对象的所有键都是有效的平台标识符或组合条件
   *
   * @param value 要检查的值
   * @returns 如果是 PlatformValue 则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * // 返回 true
   * isPlatformValue({ 'mp-weixin': 'hello', 'h5': 'world' })
   * isPlatformValue({ 'mp-weixin || mp-alipay': 'mini', 'default': 'app' })
   *
   * // 返回 false
   * isPlatformValue({ path: 'pages/index', style: {} }) // 包含非平台键
   * isPlatformValue({}) // 空对象
   * isPlatformValue(null)
   * isPlatformValue([])
   * ```
   */
  private isPlatformValue(value: unknown): value is PlatformValue<unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false
    }

    const keys = Object.keys(value)
    if (keys.length === 0) {
      return false
    }

    // 检查是否所有键都是平台标识符
    return keys.every((key) => {
      // 支持组合语法 'mp-weixin || mp-alipay'
      const platforms = key.split('||').map(p => p.trim()) as Platform[]
      return platforms.every(p => PLATFORMS_SET.has(p))
    })
  }
}
