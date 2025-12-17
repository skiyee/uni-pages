import type { Platform, PlatformValue } from '../types/ifdef'

import { PLATFORMS_SET } from './constant'

/**
 * 解析后的条件信息
 *
 * 包含原始条件字符串、关联的平台集合、值和优先级
 *
 * @template T 条件值的类型
 */
export interface ParsedCondition<T> {
  /** 原始条件字符串（如 'mp-weixin || app-plus'） */
  originalCondition: string;
  /** 关联的平台集合 */
  platforms: Set<Platform>;
  /** 条件对应的值 */
  value: T;
  /** 优先级（数字越小优先级越高） */
  priority: number;
  /** 声明顺序（用于同优先级冲突时的排序） */
  order: number;
}

/**
 * 解决冲突后的条件结果
 *
 * @template T 条件值的类型
 */
export interface ResolvedCondition<T> {
  /** 条件字符串（大写格式，如 'MP-WEIXIN' 或 'MP-WEIXIN || APP-PLUS'） */
  condition: string;
  /** 条件对应的值 */
  value: T;
}

/**
 * default 条件的特殊结果
 *
 * 包含需要排除的所有平台信息
 *
 * @template T 条件值的类型
 */
export interface DefaultCondition<T> {
  /** 固定为 'default' 标识 */
  condition: 'default';
  /** default 对应的值 */
  value: T;
  /** 需要排除的平台集合（用于生成 #ifndef） */
  excludedPlatforms: Set<Platform>;
}

/**
 * 条件解析器解析结果
 *
 * @template T 条件值的类型
 */
export interface ResolveResult<T> {
  /** 已解决冲突的条件列表 */
  conditions: ResolvedCondition<T>[];
  /** default 条件（如果存在） */
  defaultCondition: DefaultCondition<T> | null;
}

/**
 * 条件解析器
 *
 * 用于解决条件编译配置中的平台条件冲突问题。
 * 当配置中存在多个可能匹配同一平台的条件时（如 'mp-weixin' 和 'mp-weixin || app-plus'），
 * 按优先级规则进行智能分解。
 *
 * ## 优先级规则
 *
 * | 优先级 | 条件类型 | 示例 |
 * |-------|---------|------|
 * | 1 (最高) | 单平台 | 'mp-weixin' |
 * | 2 | 双平台组合 | 'mp-weixin \|\| app-plus' |
 * | 3 | 三平台组合 | 'mp-weixin \|\| app-plus \|\| h5' |
 * | ∞ (最低) | 默认值 | 'default' |
 *
 * ## 处理逻辑
 *
 * 1. 解析所有条件为 `{platforms, value, priority}` 格式
 * 2. 按优先级从高到低排序
 * 3. 高优先级条件"占用"其平台
 * 4. 低优先级条件自动排除已占用的平台
 * 5. 如果条件的所有平台都被占用，则移除该条件
 *
 * @example
 * ```typescript
 * const resolver = new ConditionResolver()
 *
 * const input = {
 *   'h5': 'uni-app H5',
 *   'mp-weixin || app-plus': 'uniapp',
 *   'mp-weixin': 'uni-app 小程序',
 * }
 *
 * const result = resolver.resolve(input)
 * // result.conditions:
 * // [
 * //   { condition: 'H5', value: 'uni-app H5' },
 * //   { condition: 'APP-PLUS', value: 'uniapp' },
 * //   { condition: 'MP-WEIXIN', value: 'uni-app 小程序' },
 * // ]
 * ```
 */
export class ConditionResolver {
  /**
   * default 条件的特殊优先级值（最低优先级）
   */
  private static readonly DEFAULT_PRIORITY = Number.MAX_SAFE_INTEGER

  /**
   * 解决平台条件冲突
   *
   * 接收一个平台值对象，返回解决冲突后的条件列表。
   *
   * @template T 条件值的类型
   * @param platformValue 平台值对象
   * @returns 解决冲突后的结果，包含条件列表和可能的 default 条件
   *
   * @example
   * ```typescript
   * const resolver = new ConditionResolver()
   * const result = resolver.resolve({
   *   'mp-weixin': '微信小程序',
   *   'mp-weixin || h5': '小程序或H5',
   *   'default': '其他平台',
   * })
   * ```
   */
  resolve<T>(platformValue: PlatformValue<T>): ResolveResult<T> {
    // 1. 解析所有条件
    const parsedConditions = this.parseConditions(platformValue)

    // 2. 按优先级排序（优先级数值越小越优先，相同优先级按声明顺序）
    parsedConditions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return a.order - b.order
    })

    // 3. 解决冲突
    const { conditions, defaultCondition } = this.resolveConflicts(parsedConditions)

    return { conditions, defaultCondition }
  }

  /**
   * 解析平台值对象为条件列表
   *
   * @template T 条件值的类型
   * @param platformValue 平台值对象
   * @returns 解析后的条件列表
   */
  private parseConditions<T>(platformValue: PlatformValue<T>): ParsedCondition<T>[] {
    const conditions: ParsedCondition<T>[] = []
    let order = 0

    for (const [condition, value] of Object.entries(platformValue)) {
      if (value === undefined) {
        continue
      }

      const platforms = this.parseConditionToPlatforms(condition)
      const priority = this.calculatePriority(condition, platforms)

      conditions.push({
        originalCondition: condition,
        platforms,
        value: value as T,
        priority,
        order: order++,
      })
    }

    return conditions
  }

  /**
   * 解析条件字符串为平台集合
   *
   * @param condition 条件字符串（如 'mp-weixin || app-plus'）
   * @returns 平台集合
   *
   * @example
   * ```typescript
   * parseConditionToPlatforms('mp-weixin') // Set(['mp-weixin'])
   * parseConditionToPlatforms('mp-weixin || h5') // Set(['mp-weixin', 'h5'])
   * parseConditionToPlatforms('default') // Set(['default'])
   * ```
   */
  private parseConditionToPlatforms(condition: string): Set<Platform> {
    const platforms = new Set<Platform>()

    if (condition === 'default') {
      platforms.add('default')
      return platforms
    }

    const parts = condition.split('||').map(p => p.trim())

    for (const part of parts) {
      if (PLATFORMS_SET.has(part as Platform)) {
        platforms.add(part as Platform)
      }
    }

    return platforms
  }

  /**
   * 计算条件的优先级
   *
   * 优先级规则：
   * - 单平台条件优先级为 1
   * - 双平台组合优先级为 2
   * - N 平台组合优先级为 N
   * - default 优先级为 MAX_SAFE_INTEGER（最低）
   *
   * @param condition 原始条件字符串
   * @param platforms 已解析的平台集合
   * @returns 优先级数值（越小越优先）
   */
  private calculatePriority(condition: string, platforms: Set<Platform>): number {
    if (condition === 'default' || platforms.has('default')) {
      return ConditionResolver.DEFAULT_PRIORITY
    }

    return platforms.size
  }

  /**
   * 解决平台冲突
   *
   * 核心逻辑：
   * 1. 按优先级从高到低遍历条件
   * 2. 高优先级条件"占用"其平台
   * 3. 低优先级条件排除已占用的平台
   * 4. 如果条件的所有平台都被占用，移除该条件
   *
   * @template T 条件值的类型
   * @param parsedConditions 已排序的解析条件列表
   * @returns 解决冲突后的结果
   */
  private resolveConflicts<T>(parsedConditions: ParsedCondition<T>[]): ResolveResult<T> {
    const occupiedPlatforms = new Set<Platform>()
    const conditions: ResolvedCondition<T>[] = []
    let defaultCondition: DefaultCondition<T> | null = null

    for (const parsed of parsedConditions) {
      // 处理 default 条件
      if (parsed.originalCondition === 'default' || parsed.platforms.has('default')) {
        defaultCondition = {
          condition: 'default',
          value: parsed.value,
          excludedPlatforms: new Set(occupiedPlatforms),
        }
        continue
      }

      // 计算未被占用的平台
      const availablePlatforms = new Set<Platform>()
      for (const platform of parsed.platforms) {
        if (!occupiedPlatforms.has(platform)) {
          availablePlatforms.add(platform)
        }
      }

      // 如果所有平台都被占用，跳过此条件
      if (availablePlatforms.size === 0) {
        continue
      }

      // 占用平台
      for (const platform of availablePlatforms) {
        occupiedPlatforms.add(platform)
      }

      // 生成条件字符串（大写格式）
      const conditionString = this.formatCondition(availablePlatforms)

      conditions.push({
        condition: conditionString,
        value: parsed.value,
      })
    }

    return { conditions, defaultCondition }
  }

  /**
   * 将平台集合格式化为条件字符串
   *
   * @param platforms 平台集合
   * @returns 格式化的条件字符串（大写，用 ' || ' 连接）
   *
   * @example
   * ```typescript
   * formatCondition(new Set(['mp-weixin'])) // 'MP-WEIXIN'
   * formatCondition(new Set(['mp-weixin', 'h5'])) // 'H5 || MP-WEIXIN'（按字母排序）
   * ```
   */
  private formatCondition(platforms: Set<Platform>): string {
    const sortedPlatforms = [...platforms]
      .filter(p => p !== 'default')
      .map(p => p.toUpperCase())
      .sort()

    return sortedPlatforms.join(' || ')
  }
}
