import type { Page } from '../interface'
import type { DeepMaybeIfdef } from '../utils/types'
import type { PlatformValue } from './ifdef'

/**
 * 页面元数据配置类型
 *
 * 支持两种形式：
 * 1. 直接使用原始值
 * 2. 使用平台值对象字面量进行条件编译
 */
export interface PageMeta extends DeepMaybeIfdef<Page> {
  /**
   * 标识 page 类型
   */
  type?: 'page' | 'home' | PlatformValue<'page' | 'home'>;

  /**
   * 配置页面路径
   * @deprecated 无效，将会根据文件路径自动生成
   */
  path?: string;
}
