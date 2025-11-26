import type { FSWatcher } from 'chokidar'
import type { PluginOption } from 'vite'

import type { UniPagesPluginOptions } from './types/options'

import chokidar from 'chokidar'
import MagicString from 'magic-string'

import { FileManager } from './core/file-manager'
import { resolvePluginOptions } from './core/options'
import { PagesConfigFile } from './core/pages-config-file'
import { PagesJsonFile } from './core/pages-json-file'
import { logger } from './utils/debug'

export default function UniPagesPlugin(options: UniPagesPluginOptions = {}): PluginOption {
  let watcher: FSWatcher | null = null

  const uniPagesPluginOption = resolvePluginOptions(options)
  logger.debug(uniPagesPluginOption)

  const pagesConfigFile = new PagesConfigFile(uniPagesPluginOption)

  const fileManager = new FileManager(uniPagesPluginOption)

  const pagesJsonFile = new PagesJsonFile(
    uniPagesPluginOption,
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
      watcher = chokidar.watch(uniPagesPluginOption.pagesConfigFilePath).on('all', async (event) => {
        if (['add', 'change'].includes(event)) {
          await pagesConfigFile.read()

          if (pagesConfigFile.hasChanged) {
            await pagesJsonFile.set()
          }
        }
      })
    },
    async transform(code: string, id: string) {
      const pageFile = fileManager.getBy(id)
      // 判断是否已注册的页面
      if (!pageFile) {
        return
      }
      logger.info('触发热更新', `filePath: ${id}`)

      const macro = await pageFile.getMacroBy(code)

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
      if (watcher) {
        watcher.close()
      }
    },
  }
}
