import type { BuiltInPlatform } from '@uni-helper/uni-env'

import type { Page, SubPackage, TabBarItem } from '../interface'
import type { ResolvedPluginOptions } from '../types/options'
import type { PagesConfigFile } from './pages-config-file'

import { platform as currentPlatform } from '@uni-helper/uni-env'
import fg from 'fast-glob'
import path from 'pathe'

import { logger } from '../utils/debug'
import { PageFile } from './page-file'

/**
 * 文件管理器
 */
export class FileManager {
  /** Map<filePath, PageFile> */
  private files = new Map<string, PageFile>()

  constructor(
    private readonly options: ResolvedPluginOptions,
    private readonly pagesConfig: PagesConfigFile,
  ) {}

  /**
   * 扫描 所有 符合规范的文件生成 PageFile 映射
   */
  async scan(): Promise<Map<string, PageFile>> {
    const files = new Map<string, PageFile>()

    // 先处理 subPackages，避免重复出现在 pages 里
    for (const dir of this.options.subPackageDirs) {
      const root = path.basename(dir)

      for (const filePath of this.listAbsFilePath(dir)) {
        if (files.has(filePath)) {
          continue
        }

        const pagePath = this.toPagePath(path.resolve(this.options.root, dir), filePath)
        const pageFile = this.files.get(filePath) || new PageFile({ filePath, pagePath, root })

        logger.debug('scan sub packages', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`, `root: ${root}`)

        files.set(filePath, pageFile)
      }
    }

    // 处理 pages
    for (const filePath of this.listAbsFilePath(this.options.pageDir)) {
      if (files.has(filePath)) {
        continue
      }

      const pagePath = this.toPagePath(this.options.src, filePath)
      const pageFile = this.files.get(filePath) || new PageFile({ filePath, pagePath })

      logger.debug('scan main package', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`)

      files.set(filePath, pageFile)
    }

    this.files = files

    return files
  }

  /**
   * 增量扫描指定文件
   */
  async scanBy(filePaths: string[]): Promise<Map<string, PageFile>> {
    for (const filePath of filePaths) {
      const absFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.options.root, filePath)

      // 检查文件路径是否为有效的页面路径
      if (!this.isValidPagePath(absFilePath)) {
        continue
      }

      // 是否属于 分包目录中 的页面路径
      const subPackageDir = this.options.subPackageDirs.find(dir => absFilePath.startsWith(dir))
      if (subPackageDir) {
        const root = path.basename(subPackageDir)
        const pagePath = this.toPagePath(subPackageDir, absFilePath)
        const pageFile = this.files.get(absFilePath) || new PageFile({ filePath: absFilePath, pagePath, root })

        logger.debug('scan incremental sub package', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`, `root: ${root}`)
        this.files.set(absFilePath, pageFile)
      }
      else {
        const pagePath = this.toPagePath(this.options.src, absFilePath)
        const pageFile = this.files.get(absFilePath) || new PageFile({ filePath: absFilePath, pagePath })

        logger.debug('scan incremental main package', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`)

        this.files.set(absFilePath, pageFile)
      }
    }

    return this.files
  }

  /**
   * 获取所有文件
   */
  getAll(): Map<string, PageFile> {
    return this.files
  }

  /**
   * 获取指定文件
   * @param filePath 绝对文件路径
   */
  getBy(filePath: string): PageFile | undefined {
    return this.files.get(filePath)
  }

  /**
   * 移除指定文件
   */
  removeBy(filepath: string): boolean {
    return this.files.delete(filepath)
  }

  /**
   * 获取 pages 目录下的 PageFile
   */
  async getMainPackageFiles(_platform: BuiltInPlatform): Promise<PageFile[]> {
    // TODO: 平台过滤
    const files: PageFile[] = []
    for (const [, pageFile] of this.files) {
      // 跳过分包的扫描
      if (pageFile.root) {
        continue
      }

      const file = this.files.get(pageFile.filePath) || new PageFile({
        filePath: pageFile.filePath,
        pagePath: pageFile.pagePath,
        root: pageFile.root,
      })

      logger.debug('[get main package file]', `FileRoot: ${file.root}`, `FilePath: ${file.filePath}`, `PagePath: ${file.pagePath}`)
      files.push(file)
    }

    return files
  }

  /**
   * 获取 subPackages 目录下的 PageFile
   */
  async getSubPackagesFiles(_platform: BuiltInPlatform): Promise<PageFile[]> {
    // TODO: 平台过滤
    const files: PageFile[] = []
    for (const [, pageFile] of this.files) {
      // 跳过非分包的扫描
      if (!pageFile.root) {
        continue
      }

      const file = this.files.get(pageFile.filePath) || new PageFile({
        filePath: pageFile.filePath,
        pagePath: pageFile.pagePath,
        root: pageFile.root,
      })

      logger.debug('[get sub package file]', `FileRoot: ${file.root}`, `PagePath: ${file.pagePath}`, `FilePath: ${file.filePath}`)
      files.push(file)
    }

    return files
  }

  /**
   * 根据 platform 获取符合pages.json的 主包页面参数
   */
  async getMainPackageMetaList(platform = currentPlatform): Promise<Page[]> {
    const pageFiles = await this.getMainPackageFiles(platform)
    const mainPackageMetaList = await Promise.all(pageFiles.map(item => item.getPageMeta({ platform })))

    logger.debug('[get main package meta list]', `platform: ${platform}`)

    return mainPackageMetaList
  }

  /**
   * 根据 platform 获取符合pages.json的 分包组 页面参数
   */
  async getSubPackagesMetaList(platform = currentPlatform): Promise<SubPackage[]> {
    const pageFiles = await this.getSubPackagesFiles(platform)

    const subPackages: Record<string, SubPackage> = {}
    for (const pageFile of pageFiles) {
      // 判断是否拥有设置pages.json中的分包 root 属性
      if (!pageFile.root) {
        continue
      }

      subPackages[pageFile.root] ??= { root: pageFile.root, pages: [] }

      const pageMeta = await pageFile.getPageMeta({ platform })
      // warn: 有可能pages属性不存在
      subPackages[pageFile.root].pages.push(pageMeta)
    }

    const subPackagesMetaList = Object.values(subPackages)

    logger.debug('[get sub packages meta list]', `platform: ${platform}`)

    return subPackagesMetaList
  }

  /**
   * 根据 platform 获取符合pages.json的 tabbar 页面参数
   */
  async getTabbarMetaList(platform = currentPlatform): Promise<TabBarItem[]> {
    const pageFiles = await this.getMainPackageFiles(platform)

    const tabbarMetaList: TabBarItem[] = []
    for (const pageFile of pageFiles) {
      const item = await pageFile.getTabbarItem({ platform })
      if (item) {
        tabbarMetaList.push(item)
      }
    }

    logger.debug('[get tabbar meta list]', `platform: ${platform}`)

    return tabbarMetaList
  }

  /**
   * 检查文件路径是否为有效的页面路径
   */
  isValidPagePath(absFilePath: string): boolean {
    // 后缀检查
    if (!PageFile.exts.includes(path.extname(absFilePath))) {
      return false
    }

    // 页面目录组的前缀检查
    const validPageFileDirs = [this.options.pageDir, ...this.options.subPackageDirs]
    return validPageFileDirs.some(dir => absFilePath.startsWith(dir))
  }

  /**
   * 列出指定目录下的所有页面文件路径
   */
  private listAbsFilePath(dir: string): string[] {
    const source = PageFile.exts.map(ext => `${fg.convertPathToPattern(dir)}/**/*${ext}`)
    const paths = fg.sync(source, {
      cwd: fg.convertPathToPattern(this.options.root),
      ignore: this.options.excludeDirs,
      onlyFiles: true,
      unique: true,
      absolute: true,
    })

    return paths.map(item => path.resolve(item))
  }

  /**
   * 将 文件路径 解析为 页面路径
   */
  private toPagePath(baseDir: string, filepath: string): string {
    if (!filepath) {
      return ''
    }

    const relativePath = path.relative(baseDir, filepath)
    if (!relativePath) {
      return filepath
    }

    const ext = path.extname(relativePath)
    return relativePath.replace(ext, '')
  }
}
