import path from 'pathe'
import { describe, expect, it } from 'vitest'

import { resolvePluginOptions } from '../../src/core/options'
import { getFixturePath } from '../helpers'

const fixturesDir = getFixturePath()
const srcDir = getFixturePath('src')

describe('resolvePluginOptions', () => {
  describe('root option', () => {
    it('should use provided root path', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
      })

      expect(options.root).toBe(path.resolve(fixturesDir))
    })

    it('should resolve relative root path to absolute', () => {
      const options = resolvePluginOptions({
        root: './test/fixtures',
        src: './test/fixtures/src',
      })

      expect(path.isAbsolute(options.root)).toBe(true)
    })
  })

  describe('src option', () => {
    it('should use provided src path', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
      })

      expect(options.src).toBe(path.resolve(srcDir))
    })

    it('should resolve relative src path to absolute', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: 'src',
      })

      expect(path.isAbsolute(options.src)).toBe(true)
    })
  })

  describe('pageDir option', () => {
    it('should use default pageDir when not provided', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
      })

      expect(options.pageDir).toContain('pages')
    })

    it('should use provided pageDir', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        pageDir: 'views',
      })

      expect(options.pageDir).toContain('views')
    })

    it('should resolve relative pageDir to absolute path under src', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        pageDir: 'pages',
      })

      expect(options.pageDir).toBe(path.resolve(srcDir, 'pages'))
    })

    it('should use absolute pageDir as-is', () => {
      const absolutePageDir = path.join(srcDir, 'my-pages')
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        pageDir: absolutePageDir,
      })

      expect(options.pageDir).toBe(absolutePageDir)
    })
  })

  describe('subPackageDirs option', () => {
    it('should default to empty array', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
      })

      expect(options.subPackageDirs).toEqual([])
    })

    it('should resolve relative subPackageDirs to absolute paths', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        subPackageDirs: ['pages-sub', 'pages-other'],
      })

      expect(options.subPackageDirs).toHaveLength(2)
      options.subPackageDirs.forEach((dir) => {
        expect(path.isAbsolute(dir)).toBe(true)
      })
    })

    it('should preserve absolute subPackageDirs', () => {
      const absoluteDir = path.join(srcDir, 'pages-sub')
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        subPackageDirs: [absoluteDir],
      })

      expect(options.subPackageDirs[0]).toBe(absoluteDir)
    })
  })

  describe('excludePages option', () => {
    it('should default to empty array', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
      })

      expect(options.excludePages).toEqual([])
    })

    it('should use provided excludePages patterns', () => {
      const excludePatterns = ['**/test/**', '**/demo/**']
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        excludePages: excludePatterns,
      })

      expect(options.excludePages).toEqual(excludePatterns)
    })
  })

  describe('dts option', () => {
    it('should generate default dts path when true', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        dts: true,
      })

      expect(options.dts).toBe(path.resolve(srcDir, 'pages.d.ts'))
    })

    it('should be false when disabled', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        dts: false,
      })

      expect(options.dts).toBe(false)
    })

    it('should use custom dts path', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        dts: 'types/pages.d.ts',
      })

      expect(options.dts).toBe(path.resolve(srcDir, 'types/pages.d.ts'))
    })
  })

  describe('debug option', () => {
    it('should default to false', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
      })

      expect(options.debug).toBe(false)
    })

    it('should enable debug when set to true', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        debug: true,
      })

      expect(options.debug).toBe(true)
    })
  })

  describe('pagesJsonFilePath', () => {
    it('should be resolved to src/pages.json', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
      })

      expect(options.pagesJsonFilePath).toBe(path.resolve(srcDir, 'pages.json'))
    })
  })

  describe('watchPageFileDirs', () => {
    it('should include pageDir', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        pageDir: 'pages',
      })

      expect(options.watchPageFileDirs).toContain(options.pageDir)
    })

    it('should include all subPackageDirs', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        pageDir: 'pages',
        subPackageDirs: ['pages-sub', 'pages-other'],
      })

      expect(options.watchPageFileDirs).toContain(options.pageDir)
      options.subPackageDirs.forEach((dir) => {
        expect(options.watchPageFileDirs).toContain(dir)
      })
    })

    it('should have correct length', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        pageDir: 'pages',
        subPackageDirs: ['pages-sub'],
      })

      // pageDir + subPackageDirs
      expect(options.watchPageFileDirs).toHaveLength(2)
    })
  })

  describe('complete options', () => {
    it('should resolve all options correctly', () => {
      const options = resolvePluginOptions({
        root: fixturesDir,
        src: srcDir,
        pageDir: 'pages',
        subPackageDirs: ['pages-sub'],
        excludePages: ['**/test/**'],
        dts: 'types/pages.d.ts',
        debug: true,
      })

      expect(options.root).toBe(path.resolve(fixturesDir))
      expect(options.src).toBe(path.resolve(srcDir))
      expect(options.pageDir).toBe(path.resolve(srcDir, 'pages'))
      expect(options.subPackageDirs).toHaveLength(1)
      expect(options.excludePages).toEqual(['**/test/**'])
      expect(options.dts).toBe(path.resolve(srcDir, 'types/pages.d.ts'))
      expect(options.debug).toBe(true)
      expect(options.pagesJsonFilePath).toBe(path.resolve(srcDir, 'pages.json'))
      expect(options.watchPageFileDirs).toHaveLength(2)
    })
  })
})
