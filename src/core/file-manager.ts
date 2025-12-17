import type { Page, SubPackage, TabBarItem } from '../interface'
import type { ResolvedPluginOptions } from '../types/options'

import anymatch from 'anymatch'
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

        logger.debug('[scan sub packages]', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`, `root: ${root}`)

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

      logger.debug('[scan main package]', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`)

      files.set(filePath, pageFile)
    }

    this.files = files

    return files
  }

  /**
   * 增量扫描指定文件
   */
  scanBy(filePath: string): PageFile | undefined {
    const absFilePath = path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(this.options.root, filePath)

    // 检查文件路径是否为有效的页面路径
    if (!this.validBy(absFilePath)) {
      return
    }

    // 是否有过缓冲
    if (this.files.has(absFilePath)) {
      return this.getBy(absFilePath)
    }

    // 是否属于 分包目录中 的页面路径
    const subPackageDir = this.options.subPackageDirs.find(dir => absFilePath.startsWith(dir))
    if (subPackageDir) {
      const root = path.basename(subPackageDir)
      const pagePath = this.toPagePath(subPackageDir, absFilePath)
      const pageFile = this.files.get(absFilePath) || new PageFile({ filePath: absFilePath, pagePath, root })

      logger.debug('[scan incremental sub package]', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`, `root: ${root}`)
      this.files.set(absFilePath, pageFile)

      return pageFile
    }
    else {
      const pagePath = this.toPagePath(this.options.src, absFilePath)
      const pageFile = this.files.get(absFilePath) || new PageFile({ filePath: absFilePath, pagePath })

      logger.debug('[scan incremental main package]', `pageFilePath: ${pageFile.filePath}`, `pagePath: ${pagePath}`)

      this.files.set(absFilePath, pageFile)

      return pageFile
    }
  }

  /**
   * 获取所有文件
   */
  getAll(): Map<string, PageFile> {
    return this.files
  }

  /**
   * 是否符合条件的文件
   */
  validBy(absFilePath: string) {
    absFilePath = path.normalize(absFilePath)
    // 后缀检查
    if (!PageFile.exts.includes(path.extname(absFilePath))) {
      return false
    }

    // TODO: 这里面需要注意被过滤的页面

    // 页面目录组的前缀检查
    const validPageFileDirs = [this.options.pageDir, ...this.options.subPackageDirs]
    const isValidPage = validPageFileDirs.some(dir => absFilePath.startsWith(dir))

    const excludePatterns = this.options.excludePages.map(item => path.resolve(this.options.src, item))
    const isExcludePage = anymatch(excludePatterns, absFilePath)
    return isValidPage && !isExcludePage
  }

  /**
   * 获取指定文件
   * @param filePath 绝对文件路径
   */
  getBy(filePath: string): PageFile | undefined {
    logger.info('从缓冲的文件映射中获取文件信息', `FilePath: ${filePath}`)
    return this.files.get(path.normalize(filePath))
  }

  /**
   * 移除指定文件
   */
  removeBy(filePath: string): boolean {
    logger.info('从缓冲的文件映射中移除文件信息', `FilePath: ${filePath}`)
    return this.files.delete(path.normalize(filePath))
  }

  /**
   * 获取 pages 目录下的 PageFile
   */
  async getMainPackageFiles(): Promise<PageFile[]> {
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
  async getSubPackagesFiles(): Promise<PageFile[]> {
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
   * 获取符合 pages.json 的主包页面参数
   */
  async getMainPackageMetaList(): Promise<Page[]> {
    const pageFiles = await this.getMainPackageFiles()
    const mainPackageMetaList = await Promise.all(pageFiles.map(item => item.getPageMeta()))

    logger.debug('[get main package meta list]')

    return mainPackageMetaList
  }

  /**
   * 获取符合 pages.json 的分包组页面参数
   */
  async getSubPackagesMetaList(): Promise<SubPackage[]> {
    const pageFiles = await this.getSubPackagesFiles()

    const subPackages: Record<string, SubPackage> = {}
    for (const pageFile of pageFiles) {
      // 判断是否拥有设置pages.json中的分包 root 属性
      if (!pageFile.root) {
        continue
      }

      subPackages[pageFile.root] ??= { root: pageFile.root, pages: [] }

      const pageMeta = await pageFile.getPageMeta()

      subPackages[pageFile.root].pages ??= []
      subPackages[pageFile.root].pages.push(pageMeta)
    }

    const subPackagesMetaList = Object.values(subPackages)

    logger.debug('[get sub packages meta list]')

    return subPackagesMetaList
  }

  /**
   * 获取符合 pages.json 的 tabbar 页面参数
   */
  async getTabbarMetaList(): Promise<TabBarItem[]> {
    const pageFiles = await this.getMainPackageFiles()

    const tabbarMetaList: TabBarItem[] = []
    for (const pageFile of pageFiles) {
      const item = await pageFile.getTabbarItem()
      if (item) {
        tabbarMetaList.push(item)
      }
    }

    logger.debug('[get tabbar meta list]')

    return tabbarMetaList
  }

  /**
   * 列出指定目录下的所有页面文件路径
   */
  private listAbsFilePath(dir: string): string[] {
    const relativeDir = path.relative(this.options.root, dir)
    const source = PageFile.exts.map(ext => `${fg.convertPathToPattern(relativeDir)}/**/*${ext}`)
    const ignore = this.options.excludePages.map(item => fg.convertPathToPattern(
      path.relative(this.options.root, path.join(this.options.src, item))),
    )

    const paths = fg.sync(source, {
      cwd: fg.convertPathToPattern(this.options.root),
      ignore,
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
