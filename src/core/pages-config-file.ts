import type { BuiltInPlatform } from '@uni-helper/uni-env'

import type { PagesJson } from '../interface'
import type { DefineConfigInput } from '../types/config'
import type { ResolvedPluginOptions } from '../types/options'

import fs from 'node:fs'

import { platform as currentPlatform } from '@uni-helper/uni-env'
import fg from 'fast-glob'
import path from 'pathe'

import { logger } from '../utils/debug'
import { deepCopy } from '../utils/object'
import { parseCode } from '../utils/parser'

export async function defineConfig(args: DefineConfigInput): Promise<PagesJson> {
  return args
}

export class PagesConfigFile {
  /**
   * pages.config 文件路径
   */
  private filePath = ''
  /**
   * pages.config 文件内容
   */
  private currentCode = ''
  /**
   * 上次 pages.config 文件内容
   */
  private lastCode = ''
  /**
   * 文件是否有改动
   */
  private isChanged = true
  /**
   * json 内容
   */
  private jsonMap: Map<BuiltInPlatform, PagesJson> = new Map()

  static readonly basename = 'pages.config'
  static readonly exts = ['.ts', '.mts', '.cts', '.js', '.cjs', '.mjs']
  static readonly globPath = `${PagesConfigFile.basename}.{${PagesConfigFile.exts.map(ext => ext.slice(1)).join(',')}}`

  constructor(private readonly options: ResolvedPluginOptions) {}

  /**
   * 获取监听路径
   */
  static getWatchPath(src: string) {
    return path.join(src, this.globPath)
  }

  /**
   * 初始检查
   */
  check() {
    const pagesConfigFilePaths = fg.globSync(PagesConfigFile.globPath, {
      cwd: this.options.src,
      absolute: true,
    })
    if (pagesConfigFilePaths.length !== 0) {
      this.setPath(pagesConfigFilePaths[0])
      this.read()
    }
  }

  /**
   * 设置文件路径
   */
  setPath(filePath: string): void {
    this.filePath = path.normalize(filePath)
  }

  /**
   * 是否有更改
   */
  get hasChanged() {
    return this.isChanged
  }

  /**
   * 读取 pages.config 文件
   */
  async read(): Promise<void> {
    if (!this.filePath) {
      logger.warn('pages.config.x 配置文件不存在，请新增后再继续')
      return
    }

    this.currentCode = await fs.promises.readFile(this.filePath, { encoding: 'utf-8' })

    this.isChanged = this.currentCode !== this.lastCode
    this.lastCode = this.currentCode

    logger.info('已读取 pages.config 文件')
  }

  /**
   * 获取 pages.config 解析后的 json
   */
  async getByPlatform(platform: BuiltInPlatform = currentPlatform, isForce: boolean = false): Promise<PagesJson | undefined> {
    if (isForce) {
      await this.read()
    }

    if (!this.filePath || !this.currentCode) {
      return
    }

    // 如果没有被更改，尝试从缓冲获取
    if (!this.isChanged) {
      const json = this.jsonMap.get(platform)
      if (json) {
        logger.info('[get page config by platform]', `Platform: ${platform}`, '获取到缓冲的 pages.config 配置')
        return deepCopy(json)
      }
    }

    const parsed = await parseCode({
      code: this.currentCode,
      filename: this.filePath,
      env: { UNI_PLATFORM: platform },
    })

    const res = typeof parsed === 'function'
      ? await Promise.resolve(parsed({ platform }))
      : await Promise.resolve(parsed)

    this.jsonMap.set(platform, res)
    logger.info('按平台储存 pages.config 配置')

    this.isChanged = false

    logger.info('获取到全新的 pages.config 配置')
    return deepCopy(res)
  }
}
