import type { FSWatcher } from 'chokidar'
import type { PluginOption } from 'vite'

import type { UniPagesPluginOptions } from './types/options'

import chokidar from 'chokidar'
import MagicString from 'magic-string'

import { FileManager } from './core/file-manager'
import { IfdefJsonGenerator } from './core/ifdef-json-generator'
import { resolvePluginOptions } from './core/options'
import { PagesConfigFile } from './core/pages-config-file'
import { PagesJsonFile } from './core/pages-json-file'
import { logger } from './utils/debug'

export default function UniPagesPlugin(options: UniPagesPluginOptions = {}): PluginOption {
  const watchers: FSWatcher[] = []

  const resolvedOptions = resolvePluginOptions(options)
  logger.debug(resolvedOptions)

  const pagesConfigFile = new PagesConfigFile(resolvedOptions)

  const fileManager = new FileManager(resolvedOptions)
  const ifdefGenerator = new IfdefJsonGenerator()

  const pagesJsonFile = new PagesJsonFile(
    resolvedOptions,
    pagesConfigFile,
    fileManager,
    ifdefGenerator,
  )

  // 检查 pages.json 文件
  pagesJsonFile.check()

  return {
    name: 'uni-pages',
    enforce: 'pre',
    async configResolved() {
      // 注册 pages.config 文件
      await pagesConfigFile.init(async () => {
        logger.debug('pages.config 配置变更监听触发')
        await pagesJsonFile.set()
      })

      // 扫描并注册页面信息
      await fileManager.scan()
      // 设置 pages.json 文件
      await pagesJsonFile.set()
    },
    buildStart() {
      // 页面文件监视器
      const pageFileWatcher = chokidar.watch(resolvedOptions.watchPageFileDirs, { ignoreInitial: true })
      pageFileWatcher.on('all', async (event, filePath) => {
        if (!['add', 'unlink'].includes(event)) {
          return
        }

        const pageFile = fileManager.scanBy(filePath)
        if (!pageFile) {
          return
        }

        if (event === 'add') {
          logger.debug('页面新增监听触发')

          if (pageFile.hasChanged) {
            await pagesJsonFile.set()
          }
        }

        if (event === 'unlink') {
          logger.debug('页面移除监听触发')

          fileManager.removeBy(filePath)

          await pagesJsonFile.set()
        }
      })
      watchers.push(pageFileWatcher)
    },
    async transform(code: string, id: string) {
      // 扫描当前页面
      const pageFile = fileManager.scanBy(id)
      if (!pageFile) {
        return
      }

      const macro = await pageFile.setBy(code)

      if (!macro) {
        return
      }

      if (pageFile.hasChanged) {
        await pagesJsonFile.set()
      }

      const s = new MagicString(code)
      s.remove(macro.ast.start!, macro.ast.end!)
      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: s.generateMap({
            source: id,
            includeContent: true,
            file: `${id}.map`,
          }),
        }
      }
    },
    async closeWatcher() {
      // 关闭页面文件监视器
      watchers.forEach(watcher => watcher.close())

      // 关闭对配置文件监视
      await pagesConfigFile.unwatch()
    },
  }
}
