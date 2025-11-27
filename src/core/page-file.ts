import type { BuiltInPlatform } from '@uni-helper/uni-env'
import type { SFCDescriptor, SFCScriptBlock } from '@vue/compiler-sfc'

import type { Page, TabBarItem } from '../interface'
import type { PageMeta, PageMetaInput } from '../types/macro'

import fs from 'node:fs/promises'

import * as t from '@babel/types'
import { platform as currentPlatform } from '@uni-helper/uni-env'
import { parse as VueParser } from '@vue/compiler-sfc'
import { babelParse, isCallOf } from 'ast-kit'

import { babelGenerate } from '../utils/babel'
import { logger } from '../utils/debug'
import { deepCopy } from '../utils/object'
import { parseCode } from '../utils/parser'

export const PAGE_TYPE_KEY = Symbol.for('page_type')
export const TABBAR_INDEX_KEY = Symbol.for('tabbar_index')

export interface PageFileOption {
  /** 文件路径 */
  filePath: string;
  /** 页面路径，对应 pages.json 中的 path */
  pagePath: string;
  /** subPackages 中的 root，为空则非subPackage */
  root?: string;
}

export interface MacroInfo {
  imports: t.ImportDeclaration[];
  ast: t.CallExpression;
  code: string;
  preparedCode: string;
}

export class PageFile {
  /** 文件的绝对路径 */
  readonly filePath: string

  /** 对应 pages.json 中的 path */
  readonly pagePath: string

  /** 对应 pages.json 中的 subPackages 中的 root */
  readonly root: string

  /** 是否已初始化 */
  private isChanged = true

  /** 当前文件的源码 */
  private source: string = ''

  /** 上次的 definePageMeta 参数的代码 */
  private lastCode: string = ''

  /** platform => page meta */
  private metaMap: Map<BuiltInPlatform, PageMeta> = new Map()

  private sfc?: SFCDescriptor
  private macro?: MacroInfo

  /**
   * 页面文件的扩展名
   */
  static readonly exts = ['.vue', '.nvue', '.uvue']

  constructor({ filePath, pagePath, root = '' }: PageFileOption) {
    this.filePath = filePath
    this.pagePath = pagePath
    this.root = root
  }

  async getTabbarItem({ platform = currentPlatform, forceRead = false }: { platform?: BuiltInPlatform; forceRead?: boolean } = {}): Promise<TabBarItem | undefined> {
    if (forceRead || !this.source) {
      await this.setBy()
    }
    if (!this.metaMap.has(platform)) {
      await this.parsePageMeta({ platform })
    }

    const { tabbar } = this.metaMap.get(platform) || {}
    if (tabbar === undefined) {
      return
    }

    const { index, pagePath, ...others } = deepCopy(tabbar)

    return {
      pagePath: pagePath || this.pagePath,
      ...others,
      [TABBAR_INDEX_KEY]: index,
    }
  }

  hasChanged() {
    return this.isChanged
  }

  /**
   * 查询获取宏信息
   */
  private findMacro(sfcScript: SFCScriptBlock | null): { imports: t.ImportDeclaration[]; macro: t.CallExpression } | undefined {
    if (!sfcScript) {
      return
    }

    const ast = babelParse(sfcScript.content, sfcScript.lang || 'js', {
      plugins: [['importAttributes', { deprecatedAssertSyntax: true }]],
    })

    let macro: t.CallExpression | undefined

    for (const stmt of ast.body) {
      let node: t.Node = stmt
      if (stmt.type === 'ExpressionStatement') {
        node = stmt.expression
      }

      if (isCallOf(node, 'definePageMeta')) {
        macro = node
        break
      }
    }

    if (!macro) {
      return
    }

    const imports: t.ImportDeclaration[] = []
    for (const stmt of ast.body) {
      if (t.isImportDeclaration(stmt)) {
        imports.push(stmt)
      }
    }

    return {
      imports,
      macro,
    }
  }

  /**
   * 获取宏信息
   * @param source 指定文件内容，为空则读取文件
   */
  async setBy(source?: string) {
    // 获取当前 PageFile 源码
    this.source = source ?? await fs.readFile(this.filePath, { encoding: 'utf-8' })

    this.sfc = (
      VueParser(this.source, {
        pad: 'space',
        filename: this.filePath,
      }).descriptor
      || (VueParser as any)({
        source: this.source,
        filename: this.filePath,
      })
    )

    let res = this.findMacro(this.sfc.scriptSetup)

    if (!res) {
      res = this.findMacro(this.sfc.script)
    }

    if (!res) {
      return
    }

    const [arg1] = res.macro.arguments

    if (arg1 && !t.isFunctionExpression(arg1) && !t.isArrowFunctionExpression(arg1) && !t.isObjectExpression(arg1)) {
      logger.warn(`definePageMeta() 参数仅支持函数或对象：${this.filePath}`)
      return
    }

    const code = babelGenerate(arg1).code
    const preparedCode = ([
      ...res.imports.map(imp => babelGenerate(imp).code),
      `export default ${code}`,
    ]).join('\n')

    this.macro = {
      imports: res.imports,
      ast: res.macro,
      code,
      preparedCode,
    }

    // TODO
    this.isChanged = this.lastCode !== code
    this.lastCode = code

    return this.macro
  }

  async parsePageMeta({ platform = currentPlatform }: {
    platform?: BuiltInPlatform;
  } = {}): Promise<PageMeta | undefined> {
    if (!this.macro) {
      this.metaMap.delete(platform)
      return undefined
    }

    const parsed = await parseCode({
      code: this.macro.preparedCode,
      filename: this.filePath,
      env: { UNI_PLATFORM: platform },
    })

    const meta = typeof parsed === 'function'
      ? await Promise.resolve(parsed({ platform }))
      : await Promise.resolve(parsed)

    this.metaMap.set(platform, meta)

    this.isChanged = false

    return meta
  }

  async getPageMeta({ platform = currentPlatform, forceRead = false }: {
    platform?: BuiltInPlatform;
    forceRead?: boolean;
  } = {}): Promise<Page> {
    if (forceRead || !this.source) {
      await this.setBy()
    }

    // 如果被改变或者未被转义过
    if (this.isChanged || !this.metaMap.has(platform)) {
      await this.parsePageMeta({ platform })
    }

    const { tabbar: _, path, type, ...others } = deepCopy(this.metaMap.get(platform) || {})

    return {
      path: path || this.pagePath,
      ...others,
      [PAGE_TYPE_KEY]: type || 'page',
    } as Page
  }
}

export function getPageType(page: Page): 'page' | 'home' {
  return page[PAGE_TYPE_KEY as any] || 'page'
}

export function getTabbarIndex(tabbarItem: TabBarItem): number {
  return tabbarItem[TABBAR_INDEX_KEY as any] || 0
}
