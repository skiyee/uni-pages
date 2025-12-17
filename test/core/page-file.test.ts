import { describe, expect, it } from 'vitest'

import { getPageType, getTabbarIndex, PAGE_TYPE_KEY, PageFile, TABBAR_INDEX_KEY } from '../../src/core/page-file'
import { createMockVueSFC, createPageWithMeta, getFixturePath } from '../helpers'

describe('PageFile', () => {
  describe('constructor', () => {
    it('should create PageFile with required properties', () => {
      const filePath = getFixturePath('src', 'pages', 'index/index.vue')
      const pageFile = new PageFile({
        filePath,
        pagePath: 'pages/index/index',
      })

      expect(pageFile.filePath).toBe(filePath)
      expect(pageFile.pagePath).toBe('pages/index/index')
      expect(pageFile.root).toBe('')
    })

    it('should create PageFile with subPackage root', () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages-sub/index.vue'),
        pagePath: 'pages-sub/index',
        root: 'pages-sub',
      })

      expect(pageFile.root).toBe('pages-sub')
    })
  })

  describe('static exts', () => {
    it('should include .vue extension', () => {
      expect(PageFile.exts).toContain('.vue')
    })

    it('should include .nvue extension', () => {
      expect(PageFile.exts).toContain('.nvue')
    })

    it('should include .uvue extension', () => {
      expect(PageFile.exts).toContain('.uvue')
    })
  })

  describe('setBy', () => {
    it('should extract definePageMeta from script setup', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'index/index.vue'),
        pagePath: 'pages/index/index',
      })

      const source = createPageWithMeta({
        path: 'pages/index/index',
        style: {
          navigationBarTitleText: '首页',
        },
      })

      const macro = await pageFile.setBy(source)

      expect(macro).not.toBeUndefined()
      expect(macro?.code).toContain('path')
      expect(macro?.code).toContain('style')
    })

    it('should extract definePageMeta from regular script', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'test/index.vue'),
        pagePath: 'pages/test/index',
      })

      const source = createMockVueSFC(
        `definePageMeta({
  path: 'pages/test/index',
})

export default {
  name: 'TestPage',
}`,
        false,
      )

      const macro = await pageFile.setBy(source)

      expect(macro).not.toBeUndefined()
    })

    it('should return undefined when no definePageMeta found', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'no-meta/index.vue'),
        pagePath: 'pages/no-meta/index',
      })

      const source = createMockVueSFC(`const message = 'Hello'`)

      const macro = await pageFile.setBy(source)

      expect(macro).toBeUndefined()
    })

    it('should mark hasChanged when code changes', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'change/index.vue'),
        pagePath: 'pages/change/index',
      })

      const source1 = createPageWithMeta({
        path: 'pages/change/index',
        style: { navigationBarTitleText: '标题1' },
      })

      await pageFile.setBy(source1)
      expect(pageFile.hasChanged).toBe(true)

      // 解析后 hasChanged 应该重置
      await pageFile.parsePageMeta()
      expect(pageFile.hasChanged).toBe(false)

      // 修改内容后 hasChanged 应该变为 true
      const source2 = createPageWithMeta({
        path: 'pages/change/index',
        style: { navigationBarTitleText: '标题2' },
      })

      await pageFile.setBy(source2)
      expect(pageFile.hasChanged).toBe(true)
    })
  })

  describe('parsePageMeta', () => {
    it('should parse page meta correctly', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'parse/index.vue'),
        pagePath: 'pages/parse/index',
      })

      const source = createPageWithMeta({
        style: {
          navigationBarTitleText: '解析测试',
          enablePullDownRefresh: true,
        },
      })

      await pageFile.setBy(source)
      const meta = await pageFile.parsePageMeta()

      expect(meta).toBeDefined()
      expect(meta?.style?.navigationBarTitleText).toBe('解析测试')
      expect(meta?.style?.enablePullDownRefresh).toBe(true)
    })

    it('should return undefined when no macro', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'empty/index.vue'),
        pagePath: 'pages/empty/index',
      })

      const source = createMockVueSFC(`const x = 1`)

      await pageFile.setBy(source)
      const meta = await pageFile.parsePageMeta()

      expect(meta).toBeUndefined()
    })
  })

  describe('getPageMeta', () => {
    it('should return page object with path', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'meta/index.vue'),
        pagePath: 'pages/meta/index',
      })

      const source = createPageWithMeta({
        style: {
          navigationBarTitleText: '测试页面',
        },
      })

      await pageFile.setBy(source)
      const page = await pageFile.getPageMeta()

      expect(page.path).toBe('pages/meta/index')
      expect(page.style?.navigationBarTitleText).toBe('测试页面')
    })

    it('should use custom path from definePageMeta', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'custom/index.vue'),
        pagePath: 'pages/custom/index',
      })

      const source = createPageWithMeta({
        path: 'custom/path',
        style: {
          navigationBarTitleText: '自定义路径',
        },
      })

      await pageFile.setBy(source)
      const page = await pageFile.getPageMeta()

      expect(page.path).toBe('custom/path')
    })

    it('should set page type correctly', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'home/index.vue'),
        pagePath: 'pages/home/index',
      })

      const source = createPageWithMeta({
        type: 'home',
      })

      await pageFile.setBy(source)
      const page = await pageFile.getPageMeta()

      expect(getPageType(page)).toBe('home')
    })

    it('should default to page type', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'default/index.vue'),
        pagePath: 'pages/default/index',
      })

      const source = createPageWithMeta({
        style: {},
      })

      await pageFile.setBy(source)
      const page = await pageFile.getPageMeta()

      expect(getPageType(page)).toBe('page')
    })
  })

  describe('getTabbarItem', () => {
    it('should return tabbar item when defined', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'tabbar/index.vue'),
        pagePath: 'pages/tabbar/index',
      })

      const source = createPageWithMeta({
        tabbar: {
          index: 0,
          text: '首页',
          iconPath: 'static/tabbar/home.png',
          selectedIconPath: 'static/tabbar/home-selected.png',
        },
      })

      await pageFile.setBy(source)
      const tabbarItem = await pageFile.getTabbarItem()

      expect(tabbarItem).toBeDefined()
      expect(tabbarItem?.pagePath).toBe('pages/tabbar/index')
      expect(tabbarItem?.text).toBe('首页')
      expect(tabbarItem?.iconPath).toBe('static/tabbar/home.png')
      expect(getTabbarIndex(tabbarItem!)).toBe(0)
    })

    it('should return undefined when no tabbar defined', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'no-tabbar/index.vue'),
        pagePath: 'pages/no-tabbar/index',
      })

      const source = createPageWithMeta({
        style: {},
      })

      await pageFile.setBy(source)
      const tabbarItem = await pageFile.getTabbarItem()

      expect(tabbarItem).toBeUndefined()
    })

    it('should use custom pagePath from tabbar config', async () => {
      const pageFile = new PageFile({
        filePath: getFixturePath('src', 'pages', 'tabbar-custom/index.vue'),
        pagePath: 'pages/tabbar-custom/index',
      })

      const source = createPageWithMeta({
        tabbar: {
          index: 1,
          pagePath: 'custom/tabbar/path',
          text: '自定义',
        },
      })

      await pageFile.setBy(source)
      const tabbarItem = await pageFile.getTabbarItem()

      expect(tabbarItem?.pagePath).toBe('custom/tabbar/path')
    })
  })

  describe('getPageType helper', () => {
    it('should return page type from symbol property', () => {
      const page = {
        path: 'test',
        [PAGE_TYPE_KEY]: 'home',
      }

      expect(getPageType(page as any)).toBe('home')
    })

    it('should return default page type when not set', () => {
      const page = {
        path: 'test',
      }

      expect(getPageType(page as any)).toBe('page')
    })
  })

  describe('getTabbarIndex helper', () => {
    it('should return tabbar index from symbol property', () => {
      const tabbarItem = {
        pagePath: 'test',
        text: 'Test',
        [TABBAR_INDEX_KEY]: 2,
      }

      expect(getTabbarIndex(tabbarItem as any)).toBe(2)
    })

    it('should return 0 when index not set', () => {
      const tabbarItem = {
        pagePath: 'test',
        text: 'Test',
      }

      expect(getTabbarIndex(tabbarItem as any)).toBe(0)
    })
  })
})
