import type { ConfigWatcher } from 'c12'

import type { DefineConfigInput, PagesJsonConfig } from '../types/config'
import type { ResolvedPluginOptions } from '../types/options'

import { watchConfig } from 'c12'
import path from 'pathe'

import { logger } from '../utils/debug'
import { deepCopy } from '../utils/object'

/**
 * 定义 pages.config 配置
 *
 * @param args 配置对象，支持条件编译值
 * @returns 配置对象
 */
export function defineConfig(args: DefineConfigInput): PagesJsonConfig {
  return args as PagesJsonConfig
}

/**
 * 配置更新回调类型
 */
export type OnConfigUpdateCallback = () => Promise<void> | void

/**
 * PagesConfigFile - 配置文件管理器
 *
 * - 配置文件加载
 * - 文件变化监视（内置 chokidar）
 * - 内容变化检测（通过 getDiff）
 * - 防抖处理
 */
export class PagesConfigFile {
  /**
   * 配置监视器实例
   */
  private watcher?: ConfigWatcher<PagesJsonConfig>

  /**
   * 当前配置缓存
   */
  private cachedConfig?: PagesJsonConfig

  /**
   * 配置文件路径
   */
  private configFilePath = ''

  /**
   * 配置更新回调函数
   */
  private onUpdateCallback?: OnConfigUpdateCallback

  constructor(private readonly options: ResolvedPluginOptions) {}

  /**
   * 初始化并加载配置文件
   */
  async init(updateCallback: OnConfigUpdateCallback): Promise<void> {
    logger.debug('初始化 pages.config 配置文件监视')

    this.onUpdateCallback = updateCallback

    // 使用 watchConfig 进行初始加载，配置将在后续被复用
    this.watcher = await watchConfig<PagesJsonConfig>({
      cwd: this.options.src,
      name: 'pages',
      rcFile: false,
      globalRc: false,
      packageJson: false,
      dotenv: false,
      envName: false,
      // 初始加载时禁用监视器的事件处理
      onWatch: () => {},
      acceptHMR: ({ getDiff }) => {
        const diff = getDiff()
        // 如果没有变化，返回 true 阻止 onUpdate 调用
        return diff.length === 0
      },
      onUpdate: async ({ newConfig }) => {
        this.cachedConfig = newConfig.config
        logger.info('pages.config 配置已更新')

        // 调用外部注册的回调
        if (this.onUpdateCallback) {
          await this.onUpdateCallback()
        }
      },
    })

    if (this.watcher.configFile) {
      this.configFilePath = path.normalize(this.watcher.configFile)
      this.cachedConfig = this.watcher.config
      logger.info('加载 pages.config 配置文件:', this.configFilePath)
    }
  }

  /**
   * 注册配置更新回调
   * 当配置内容发生变化时会调用此回调
   */
  onUpdate(callback: OnConfigUpdateCallback): void {
    this.onUpdateCallback = callback
  }

  /**
   * 获取当前配置文件路径
   */
  getPath(): string {
    return this.configFilePath
  }

  /**
   * 获取正在监视的文件列表
   */
  getWatchingFiles(): string[] {
    return this.watcher?.watchingFiles ?? []
  }

  /**
   * 获取 pages.config 解析后的配置
   * 返回的配置可能包含条件编译值
   */
  async get(): Promise<PagesJsonConfig | undefined> {
    if (!this.configFilePath) {
      logger.warn('pages.config.x 配置文件不存在，请新增后再继续')
      return
    }

    logger.debug('[get page config]', '获取 pages.config 配置')
    return deepCopy(this.cachedConfig)
  }

  /**
   * 停止配置文件监视
   */
  async unwatch(): Promise<void> {
    if (this.watcher) {
      await this.watcher.unwatch()
      logger.debug('已停止 pages.config 配置文件监视')
    }
  }
}
