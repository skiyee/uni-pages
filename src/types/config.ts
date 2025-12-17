import type { PagesJson } from '../interface'
import type { DeepMaybeIfdef } from '../utils/types'

export type PagesJsonConfig = PagesJson

export type DefineConfigInput = DeepMaybeIfdef<PagesJson>
