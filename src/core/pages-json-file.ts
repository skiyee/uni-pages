import type { PagesJson, SubPackage } from '../interface'
import type { ResolvedPluginOptions } from '../types/options'
import type { FileManager } from './file-manager'
import type { IfdefJsonGenerator } from './ifdef-json-generator'
import type { PagesConfigFile } from './pages-config-file'

import fs from 'node:fs'

import path from 'pathe'

import { logger } from '../utils/debug'
import { checkFile, writeFileWithLock } from '../utils/file'
import { deepMerge } from '../utils/object'
import { getPageType, getTabbarIndex } from './page-file'

interface StaticJsonFileInfo {
  indent: string;
  eof: string;
}

/**
 * Pages.json 文件的操作
 * 负责 pages.json 文件的检测、读取和写入
 */
export class PagesJsonFile {
  private cachedInfo?: StaticJsonFileInfo
  private lastJson: string = ''

  constructor(
    private readonly options: ResolvedPluginOptions,
    private readonly pagesConfig: PagesConfigFile,
    private readonly fileManager: FileManager,
    private readonly ifdefGenerator: IfdefJsonGenerator,
  ) {}

  /**
   * 获取文件路径
   */
  getPath(): string {
    return this.options.pagesJsonFilePath
  }

  /**
   * 写入内容到文件
   */
  async write(content: string): Promise<void> {
    await writeFileWithLock(this.getPath(), content)
  }

  /**
   * 同步检测静态 pages.json 文件，如不存在或权限不正确，尝试重建
   */
  check(): boolean {
    try {
      const stat = fs.statSync(this.getPath())
      if (!stat.isFile()) {
        fs.unlinkSync(this.getPath())
        throw new Error('Not a file')
      }

      try {
        fs.accessSync(this.getPath(), fs.constants.R_OK | fs.constants.W_OK)
      }
      catch {
        try {
          fs.unlinkSync(this.getPath())
        }
        catch {
          return false
        }
        throw new Error('Permission error')
      }

      return true
    }
    catch {
      try {
        fs.mkdirSync(path.dirname(this.getPath()), { recursive: true })
        const defaultContent = JSON.stringify({ pages: [{ path: '' }] }, null, 4)
        const mode = (fs.constants.R_OK | fs.constants.W_OK) << 6
          | (fs.constants.R_OK | fs.constants.W_OK) << 3
          | (fs.constants.R_OK | fs.constants.W_OK)
        fs.writeFileSync(this.getPath(), defaultContent, { encoding: 'utf-8', mode })
        return true
      }
      catch {
        return false
      }
    }
  }

  /**
   * 检测静态 pages.json 文件信息（换行符、末端换行）
   */
  async detectInfo(forceUpdate = false): Promise<StaticJsonFileInfo> {
    if (!forceUpdate && this.cachedInfo) {
      return this.cachedInfo
    }

    const res: StaticJsonFileInfo = {
      indent: ' '.repeat(4),
      eof: '\n',
    }

    const content = await fs.promises.readFile(this.getPath(), { encoding: 'utf-8' }).catch(() => '')
    if (!content) {
      this.cachedInfo = res
      return res
    }

    try {
      res.indent = ' '.repeat(this.detectIndent(content))

      const lastChar = content[content.length - 1]
      if (lastChar === '\n') {
        res.eof = '\n'
      }
      else {
        res.eof = ''
      }

      this.cachedInfo = res
      return res
    }
    catch {
      this.cachedInfo = res
      return res
    }
  }

  /**
   * 检测缩进
   */
  private detectIndent(code: string = ''): number {
    const lines = code.split(/\r?\n/)
    const indentSizes: number[] = []

    for (const line of lines) {
      if (line.trim().length === 0) {
        continue
      }

      const match = line.match(/^(\s*)/)
      const spaces = match ? match[1].length : 0

      if (spaces > 0) {
        indentSizes.push(spaces)
      }
    }

    if (indentSizes.length === 0) {
      return 2
    }

    const uniqueIndents = [...new Set(indentSizes)].sort((a, b) => a - b)

    if (uniqueIndents.length === 1) {
      return uniqueIndents[0]
    }

    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    let baseIndent = uniqueIndents[0]

    for (let i = 1; i < uniqueIndents.length; i++) {
      baseIndent = gcd(baseIndent, uniqueIndents[i])
      if (baseIndent === 1) {
        break
      }
    }

    if (baseIndent >= 2 && baseIndent <= 8) {
      return baseIndent
    }

    return uniqueIndents[0]
  }

  shouldUpdate(newJson: string) {
    return this.lastJson !== newJson
  }

  generateDeclaration(pagesJson: PagesJson) {
    const subPagePaths = new Set<string>()
    const tabPaths = new Set<string>()
    const pagePaths = new Set<string>()

    for (const sub of (pagesJson.subPackages || [])) {
      for (const page of (sub.pages || [])) {
        if (sub.root && page.path) {
          subPagePaths.add(`"/${path.join(sub.root, page.path)}"`)
        }
      }
    }

    for (const tab of (pagesJson.tabBar?.list || [])) {
      tabPaths.add(`"/${tab.pagePath}"`)
    }

    for (const page of (pagesJson.pages || [])) {
      const pagePath = `"/${page.path}"`
      if (!tabPaths.has(pagePath)) {
        pagePaths.add(pagePath)
      }
    }

    const allPagePaths = new Set([...pagePaths, ...subPagePaths])

    const code = `/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
// Generated by uni-pages

interface NavigateToOptions {
  url: ${[...allPagePaths].join(' |\n       ')};
}
interface RedirectToOptions extends NavigateToOptions {}

interface SwitchTabOptions {
  ${tabPaths.size ? `url: ${[...tabPaths].join(' |\n       ')};` : ''}
}

type ReLaunchOptions = NavigateToOptions | SwitchTabOptions;

declare interface Uni {
  navigateTo(options: UniNamespace.NavigateToOptions & NavigateToOptions): void;
  redirectTo(options: UniNamespace.RedirectToOptions & RedirectToOptions): void;
  switchTab(options: UniNamespace.SwitchTabOptions & SwitchTabOptions): void;
  reLaunch(options: UniNamespace.ReLaunchOptions & ReLaunchOptions): void;
}
`
    return code
  }

  async writeDeclaration(pagesJson: PagesJson, filepath: string) {
    const ok = await checkFile({ path: filepath, newContent: '', modeFlag: fs.constants.W_OK | fs.constants.R_OK })
    if (!ok) {
      return
    }

    const originalContent = await fs.promises.readFile(filepath, 'utf-8')

    const code = this.generateDeclaration(pagesJson)
    if (!code) {
      return
    }

    if (code !== originalContent) {
      await fs.promises.writeFile(filepath, code)
    }
  }

  /**
   * 生成完整的 pages.json 配置对象
   * 返回的对象可能包含 $ifdef 创建的条件编译值
   */
  async generate(): Promise<PagesJson> {
    const pagesConfig = await this.pagesConfig.get() || {}

    // 合并 pages
    const mainPackageMetaList = await this.fileManager.getMainPackageMetaList()
    if (mainPackageMetaList.length > 0) {
      pagesConfig.pages ??= []

      for (const pageMeta of mainPackageMetaList) {
        const idx = pagesConfig.pages.findIndex((p: any) => p.path === pageMeta.path)
        if (idx !== -1) {
          pagesConfig.pages[idx] = deepMerge(pageMeta, pagesConfig.pages[idx])
        }
        else {
          pagesConfig.pages.push(pageMeta)
        }
      }
    }

    // 合并 subPackages
    const subPackagesMetaList = await this.fileManager.getSubPackagesMetaList()
    if (subPackagesMetaList.length > 0) {
      pagesConfig.subPackages ??= []

      for (const subPackageMetaList of subPackagesMetaList) {
        const subPackageRoot = subPackageMetaList.root
        const idx = pagesConfig.subPackages.findIndex(p => p.root === subPackageRoot)

        if (idx !== -1) {
          // 使用 deepMerge 合并整个 subPackage，保留 plugins 等其他字段
          const existingSubPackage: SubPackage = pagesConfig.subPackages[idx]
          const mergedPages = [...(existingSubPackage.pages || [])]

          // 合并 pages 数组
          for (const pageMeta of (subPackageMetaList.pages || [])) {
            const pageMetaIdx = mergedPages.findIndex((p: any) => p.path === pageMeta.path)
            if (pageMetaIdx !== -1) {
              mergedPages[pageMetaIdx] = deepMerge(pageMeta, mergedPages[pageMetaIdx])
            }
            else {
              mergedPages.push(pageMeta)
            }
          }

          // 将合并后的 pages 放回，保留其他字段
          pagesConfig.subPackages[idx] = {
            ...existingSubPackage,
            pages: mergedPages,
          }
        }
        else {
          pagesConfig.subPackages.push(subPackageMetaList)
        }
      }
    }

    // 合并 tabbar
    const tabbarMetaList = await this.fileManager.getTabbarMetaList()
    if (tabbarMetaList.length > 0) {
      pagesConfig.tabBar ??= {}
      pagesConfig.tabBar.list ??= []

      for (const tabbarMeta of tabbarMetaList) {
        const idx = pagesConfig.tabBar.list.findIndex((item: any) => item.pagePath === tabbarMeta.pagePath)
        if (idx !== -1) {
          pagesConfig.tabBar.list[idx] = deepMerge(tabbarMeta, pagesConfig.tabBar.list[idx])
        }
        else {
          pagesConfig.tabBar.list.push(tabbarMeta)
        }
      }
    }

    this.sortBy(pagesConfig)

    return pagesConfig
  }

  /**
   * 对 pagesJson 进行排序
   */
  sortBy(pagesJson: PagesJson): void {
    // pages 排序： home 页面优先，其他页面按顺序排列
    if (pagesJson.pages) {
      pagesJson.pages.sort((a, b) => {
        if (getPageType(a) === 'home') {
          if (getPageType(b) === 'home') {
            return 0
          }
          else {
            return -1
          }
        }
        else if (getPageType(b) === 'home') {
          return 1
        }
        else {
          return 0
        }
      })
    }

    // tabbar 排序： 按 index 升序排列
    if (pagesJson.tabBar && pagesJson.tabBar.list) {
      pagesJson.tabBar.list.sort((a, b) => getTabbarIndex(a) - getTabbarIndex(b))
    }
  }

  async set() {
    // 获取原本 pages.json 的文件格式
    const { indent, eof } = await this.detectInfo()

    // 生成 pages.json 配置对象（可能包含 $ifdef 值）
    const pagesJsonObj = await this.generate()
    logger.info('pages.json 配置对象生成完成')

    // 使用 IfdefJsonGenerator 生成带条件编译注释的 JSON
    const pagesJsonContent = this.ifdefGenerator.generate(pagesJsonObj, indent, eof)

    // 生成文件头注释
    const pagesJsonComment = `// GENERATED BY uni-pages
//
// 警告：此文件为自动生成，请勿手动修改，否则更改将丢失。
// WARNING: This file is automatically generated. DO NOT EDIT, as your changes will be overwritten.
//
// Repository: https://github.com/skiyee/uni-pages
`

    const pagesJson = pagesJsonComment + pagesJsonContent

    if (!this.shouldUpdate(pagesJson)) {
      logger.info('pages.json 内容无改动，跳过写入')
      return
    }

    this.lastJson = pagesJson

    await this.write(pagesJson)
    logger.info('pages.json 生成')

    if (this.options.dts) {
      await this.writeDeclaration(pagesJsonObj, this.options.dts)
      logger.info('pages.d.ts 生成')
    }
  }
}
