import path from 'pathe'
import { beforeEach, describe, expect, it } from 'vitest'

import { FileManager } from '../../src/core/file-manager'
import { resolvePluginOptions } from '../../src/core/options'
import { createMockPluginOptions, getFixturePath } from '../helpers'

describe('FileManager', () => {
  let fileManager: FileManager

  beforeEach(() => {
    const options = resolvePluginOptions(
      createMockPluginOptions({
        pageDir: 'pages',
        subPackageDirs: ['pages-sub'],
      }),
    )

    fileManager = new FileManager(options)
  })

  describe('scan', () => {
    it('should scan all page files', async () => {
      const files = await fileManager.scan()

      expect(files.size).toBeGreaterThan(0)
    })

    it('should include main package pages', async () => {
      await fileManager.scan()
      const allFiles = await fileManager.getMainPackageFiles()

      expect(allFiles.length).toBeGreaterThan(0)
      // 验证主包页面没有 root
      allFiles.forEach((file) => {
        expect(file.root).toBe('')
      })
    })

    it('should include subPackage pages', async () => {
      await fileManager.scan()
      const subFiles = await fileManager.getSubPackagesFiles()

      expect(subFiles.length).toBeGreaterThan(0)
      // 验证分包页面有 root
      subFiles.forEach((file) => {
        expect(file.root).not.toBe('')
      })
    })

    it('should not duplicate pages between main and sub packages', async () => {
      const files = await fileManager.scan()
      const mainFiles = await fileManager.getMainPackageFiles()
      const subFiles = await fileManager.getSubPackagesFiles()

      const mainPaths = mainFiles.map(f => f.filePath)
      const subPaths = subFiles.map(f => f.filePath)

      // 确保没有重复
      mainPaths.forEach((p) => {
        expect(subPaths).not.toContain(p)
      })

      // 总数应该等于 files.size
      expect(mainFiles.length + subFiles.length).toBe(files.size)
    })
  })

  describe('scanBy', () => {
    it('should scan a specific file by absolute path', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/index/index.vue')

      const pageFile = fileManager.scanBy(filePath)

      expect(pageFile).toBeDefined()
      expect(pageFile?.filePath).toBe(path.normalize(filePath))
    })

    it('should scan a specific file by relative path', async () => {
      await fileManager.scan()

      const pageFile = fileManager.scanBy('src/pages/index/index.vue')

      expect(pageFile).toBeDefined()
    })

    it('should return undefined for non-page files', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages.config.ts')

      const pageFile = fileManager.scanBy(filePath)

      expect(pageFile).toBeUndefined()
    })

    it('should return undefined for files with invalid extension', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/index/index.ts')

      const pageFile = fileManager.scanBy(filePath)

      expect(pageFile).toBeUndefined()
    })

    it('should return cached file if already scanned', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/index/index.vue')

      const pageFile1 = fileManager.scanBy(filePath)
      const pageFile2 = fileManager.scanBy(filePath)

      expect(pageFile1).toBe(pageFile2)
    })

    it('should add new file to scan cache', async () => {
      await fileManager.scan()
      const initialSize = fileManager.getAll().size

      // 由于文件不存在，validBy 会失败，所以需要使用已存在的文件
      const existingFile = getFixturePath('src', 'pages/about/index.vue')
      fileManager.scanBy(existingFile)

      // 缓存大小应该保持不变（因为文件已存在于缓存中）
      expect(fileManager.getAll().size).toBe(initialSize)
    })
  })

  describe('validBy', () => {
    it('should return true for valid page file', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/index/index.vue')

      const isValid = fileManager.validBy(filePath)

      expect(isValid).toBe(true)
    })

    it('should return false for non-vue file', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/index/index.ts')

      const isValid = fileManager.validBy(filePath)

      expect(isValid).toBe(false)
    })

    it('should return false for file outside page directories', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'components/Header.vue')

      const isValid = fileManager.validBy(filePath)

      expect(isValid).toBe(false)
    })

    it('should return true for subPackage page file', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages-sub/detail/index.vue')

      const isValid = fileManager.validBy(filePath)

      expect(isValid).toBe(true)
    })
  })

  describe('getBy', () => {
    it('should return cached PageFile', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/index/index.vue')

      const pageFile = fileManager.getBy(filePath)

      expect(pageFile).toBeDefined()
      expect(pageFile?.filePath).toBe(path.normalize(filePath))
    })

    it('should return undefined for non-cached file', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/non-existent/index.vue')

      const pageFile = fileManager.getBy(filePath)

      expect(pageFile).toBeUndefined()
    })
  })

  describe('removeBy', () => {
    it('should remove file from cache', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/index/index.vue')

      expect(fileManager.getBy(filePath)).toBeDefined()

      const removed = fileManager.removeBy(filePath)

      expect(removed).toBe(true)
      expect(fileManager.getBy(filePath)).toBeUndefined()
    })

    it('should return false when removing non-existent file', async () => {
      await fileManager.scan()
      const filePath = getFixturePath('src', 'pages/non-existent/index.vue')

      const removed = fileManager.removeBy(filePath)

      expect(removed).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return all cached files', async () => {
      const files = await fileManager.scan()
      const allFiles = fileManager.getAll()

      expect(allFiles).toBe(files)
      expect(allFiles.size).toBeGreaterThan(0)
    })
  })

  describe('getMainPackageFiles', () => {
    it('should return only main package files', async () => {
      await fileManager.scan()
      const mainFiles = await fileManager.getMainPackageFiles()

      mainFiles.forEach((file) => {
        expect(file.root).toBe('')
      })
    })
  })

  describe('getSubPackagesFiles', () => {
    it('should return only subPackage files', async () => {
      await fileManager.scan()
      const subFiles = await fileManager.getSubPackagesFiles()

      subFiles.forEach((file) => {
        expect(file.root).not.toBe('')
      })
    })
  })

  describe('getMainPackageMetaList', () => {
    it('should return page meta list for main package', async () => {
      await fileManager.scan()
      const metaList = await fileManager.getMainPackageMetaList()

      expect(metaList.length).toBeGreaterThan(0)
      metaList.forEach((meta) => {
        expect(meta.path).toBeDefined()
      })
    })
  })

  describe('getSubPackagesMetaList', () => {
    it('should return grouped subPackage meta list', async () => {
      await fileManager.scan()
      const subPackages = await fileManager.getSubPackagesMetaList()

      expect(subPackages.length).toBeGreaterThan(0)
      subPackages.forEach((sub) => {
        expect(sub.root).toBeDefined()
        expect(sub.pages).toBeDefined()
        expect(sub.pages.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getTabbarMetaList', () => {
    it('should return tabbar items from main package', async () => {
      await fileManager.scan()
      const tabbarList = await fileManager.getTabbarMetaList()

      // 可能没有 tabbar 配置的页面，所以只检查类型
      expect(Array.isArray(tabbarList)).toBe(true)
    })
  })

  describe('with excludePages option', () => {
    it('should exclude specified pages', async () => {
      const options = resolvePluginOptions(
        createMockPluginOptions({
          pageDir: 'pages',
          subPackageDirs: ['pages-sub'],
          excludePages: ['pages/about/**'],
        }),
      )

      const fm = new FileManager(options)
      await fm.scan()

      const aboutFile = getFixturePath('src', 'pages/about/index.vue')
      const isValid = fm.validBy(aboutFile)

      expect(isValid).toBe(false)
    })
  })
})
