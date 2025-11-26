import type { ResolvedPluginOptions, UniPagesPluginOptions } from '../types/options'

import fs from 'node:fs'
import process from 'node:process'

import path from 'pathe'

import { enableDebug } from '../utils/debug'
import { PagesConfigFile } from './pages-config-file'

export function resolvePluginOptions(options: UniPagesPluginOptions): ResolvedPluginOptions {
  let {
    root = process.env.UNI_CLI_CONTEXT || process.cwd(),
    src = process.env.UNI_INPUT_DIR,
    dts = true,
    pageDir = 'pages',
    subPackageDirs = [],
    excludes = ['node_modules', '.git', '**/__*__/**'],
    debug = false,
  } = options

  if (!src) {
    const srcPath = path.resolve(root, 'src')
    src = fs.existsSync(srcPath) ? srcPath : root
  }

  enableDebug(debug)

  const absPageDir = path.isAbsolute(pageDir) ? pageDir : path.resolve(src, pageDir)
  const absSubPackageDirs = subPackageDirs.map(dir => path.isAbsolute(dir) ? dir : path.resolve(src, dir))
  const absDts = dts === true
    ? path.resolve(src, 'pages.d.ts')
    : (typeof dts === 'string' && (path.isAbsolute(dts) ? path.join(root, dts) : path.resolve(src, dts)))

  const absPagesJsonFilePath = path.resolve(src, 'pages.json')
  const absPagesConfigFilePath = PagesConfigFile.getPath(src)

  return {
    root: path.resolve(root),
    src: path.resolve(src),
    pageDir: absPageDir,
    subPackageDirs: absSubPackageDirs,
    excludes,
    dts: absDts,
    debug,
    pagesJsonFilePath: absPagesJsonFilePath,
    pagesConfigFilePath: absPagesConfigFilePath,
  }
}
