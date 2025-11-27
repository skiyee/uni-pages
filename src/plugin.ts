import type { FSWatcher } from 'chokidar'
import type { PluginOption } from 'vite'

import type { UniPagesPluginOptions } from './types/options'

import anymatch from 'anymatch'
import chokidar from 'chokidar'
import MagicString from 'magic-string'
import path from 'pathe'

import { FileManager } from './core/file-manager'
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

  const pagesJsonFile = new PagesJsonFile(
    resolvedOptions,
    pagesConfigFile,
    fileManager,
  )

  // 检查 pages.json 文件
  pagesJsonFile.checkSync()

  return {
    name: 'uni-pages',
    enforce: 'pre',
    async configResolved() {
      // 扫描并注册页面信息
      await fileManager.scan()
      // 设置 pages.json 文件
      await pagesJsonFile.set()
    },
    buildStart() {
      const pageFileWatcher = chokidar.watch(resolvedOptions.watchPageFileDirs)
      pageFileWatcher.on('add', async (filePath) => {
        const pageFile = fileManager.scanBy(filePath)
        if (!pageFile) {
          return
        }
        logger.debug('新增监听触发')

        if (pageFile.hasChanged()) {
          await pagesJsonFile.set()
        }
      })
      pageFileWatcher.on('unlink', async (filePath) => {
        const pageFile = fileManager.scanBy(filePath)
        if (!pageFile) {
          return
        }
        logger.debug('移除监听触发')

        fileManager.removeBy(filePath)

        await pagesJsonFile.set()
      })
      watchers.push(pageFileWatcher)

      const pagesConfigWatcher = chokidar.watch(resolvedOptions.pagesConfigFilePath)
      pagesConfigWatcher.on('all', async (event) => {
        if (['add', 'change'].includes(event)) {
          await pagesConfigFile.read()
          if (pagesConfigFile.hasChanged) {
            await pagesJsonFile.set()
          }
        }
      })
      watchers.push(pagesConfigWatcher)
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

      if (pageFile.hasChanged()) {
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
    buildEnd() {
      watchers.length && watchers.map(watcher => watcher.close())
    },
  }
}
