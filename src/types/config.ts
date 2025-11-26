import type { BuiltInPlatform } from '@uni-helper/uni-env'

import type { PagesJson } from '../interface'

export interface DefineConfigFuncArgs {
  platform: BuiltInPlatform;
}

export type DefineConfigFn = (args: DefineConfigFuncArgs) => PagesJson | Promise<PagesJson>
export type DefineConfigInput = PagesJson | DefineConfigFn
