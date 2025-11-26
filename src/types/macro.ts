import type { BuiltInPlatform } from '@uni-helper/uni-env'

import type { Page } from '../interface'
import type { DeepPartial } from '../utils/types'

export interface DefinePageFuncArgs {
  platform: BuiltInPlatform;
}

export interface PageMeta extends DeepPartial<Page> {
  /**
   * 标识 page 类型
   */
  type?: 'page' | 'home';

  /**
   * 配置页面路径
   * @deprecated 无效，将会根据文件路径自动生成
   */
  path?: string;
}
export type PageMetaFn = (arg: DefinePageFuncArgs) => PageMeta | Promise<PageMeta>
export type PageMetaInput = PageMeta | PageMetaFn
