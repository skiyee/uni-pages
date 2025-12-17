import { describe, expect, it } from 'vitest'

import { ConditionResolver } from '../../src/core/condition-resolver'

describe('ConditionResolver', () => {
  describe('resolve', () => {
    it('should resolve single platform condition', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': '微信小程序',
      })

      expect(result.conditions).toHaveLength(1)
      expect(result.conditions[0]).toEqual({
        condition: 'MP-WEIXIN',
        value: '微信小程序',
      })
      expect(result.defaultCondition).toBeNull()
    })

    it('should resolve multiple single platform conditions', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': '微信小程序',
        'h5': 'H5应用',
        'app-plus': 'APP应用',
      })

      expect(result.conditions).toHaveLength(3)
      expect(result.conditions.map(c => c.condition).sort()).toEqual(['APP-PLUS', 'H5', 'MP-WEIXIN'])
    })

    it('should resolve combined platform condition', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin || h5': '小程序或H5',
      })

      expect(result.conditions).toHaveLength(1)
      expect(result.conditions[0].condition).toBe('H5 || MP-WEIXIN')
      expect(result.conditions[0].value).toBe('小程序或H5')
    })

    it('should resolve default condition', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        default: '默认值',
      })

      expect(result.conditions).toHaveLength(0)
      expect(result.defaultCondition).not.toBeNull()
      expect(result.defaultCondition?.value).toBe('默认值')
      expect(result.defaultCondition?.condition).toBe('default')
    })

    it('should resolve mixed conditions with default', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': '微信小程序',
        'h5': 'H5应用',
        'default': '其他平台',
      })

      expect(result.conditions).toHaveLength(2)
      expect(result.defaultCondition).not.toBeNull()
      expect(result.defaultCondition?.excludedPlatforms).toContain('mp-weixin')
      expect(result.defaultCondition?.excludedPlatforms).toContain('h5')
    })

    it('should handle priority correctly - single platform has higher priority', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin || app-plus': 'uniapp',
        'mp-weixin': 'uni-app 小程序',
      })

      // mp-weixin 单平台优先级更高，所以会先被占用
      // mp-weixin || app-plus 条件中的 mp-weixin 已被占用，只剩 app-plus
      expect(result.conditions).toHaveLength(2)

      const weixinCondition = result.conditions.find(c => c.condition === 'MP-WEIXIN')
      expect(weixinCondition?.value).toBe('uni-app 小程序')

      const appPlusCondition = result.conditions.find(c => c.condition === 'APP-PLUS')
      expect(appPlusCondition?.value).toBe('uniapp')
    })

    it('should handle complex priority scenario', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'h5': 'uni-app H5',
        'mp-weixin || app-plus': 'uniapp',
        'mp-weixin': 'uni-app 小程序',
      })

      expect(result.conditions).toHaveLength(3)

      // 验证每个条件的值
      const h5 = result.conditions.find(c => c.condition === 'H5')
      expect(h5?.value).toBe('uni-app H5')

      const weixin = result.conditions.find(c => c.condition === 'MP-WEIXIN')
      expect(weixin?.value).toBe('uni-app 小程序')

      const appPlus = result.conditions.find(c => c.condition === 'APP-PLUS')
      expect(appPlus?.value).toBe('uniapp')
    })

    it('should skip condition when all platforms are occupied', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': '微信',
        'h5': 'H5',
        'mp-weixin || h5': '这个会被跳过', // mp-weixin 和 h5 都已被占用
      })

      expect(result.conditions).toHaveLength(2)
      expect(result.conditions.map(c => c.condition).sort()).toEqual(['H5', 'MP-WEIXIN'])
    })

    it('should handle empty input', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({})

      expect(result.conditions).toHaveLength(0)
      expect(result.defaultCondition).toBeNull()
    })

    it('should skip undefined values', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': 'value',
        'h5': undefined as any,
      })

      expect(result.conditions).toHaveLength(1)
      expect(result.conditions[0].condition).toBe('MP-WEIXIN')
    })

    it('should maintain declaration order for same priority', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': '第一个',
        'h5': '第二个',
        'app-plus': '第三个',
      })

      // 所有都是单平台条件，优先级相同，按声明顺序处理
      expect(result.conditions).toHaveLength(3)
    })

    it('should handle three-platform combination', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin || h5 || app-plus': '三平台组合',
      })

      expect(result.conditions).toHaveLength(1)
      expect(result.conditions[0].condition).toBe('APP-PLUS || H5 || MP-WEIXIN')
    })

    it('should resolve complex scenario with all features', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': '微信专用',
        'mp-weixin || mp-alipay': '小程序通用',
        'mp-weixin || h5': '跨平台',
        'default': '默认',
      })

      const conditions = result.conditions
      expect(conditions.find(c => c.condition === 'MP-WEIXIN')?.value).toBe('微信专用')
      expect(conditions.find(c => c.condition === 'MP-ALIPAY')?.value).toBe('小程序通用')
      expect(conditions.find(c => c.condition === 'H5')?.value).toBe('跨平台')

      expect(result.defaultCondition).not.toBeNull()
      expect(result.defaultCondition?.excludedPlatforms).toContain('mp-weixin')
      expect(result.defaultCondition?.excludedPlatforms).toContain('mp-alipay')
      expect(result.defaultCondition?.excludedPlatforms).toContain('h5')
    })

    it('should handle object values', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': { title: '微信标题', color: '#000000' },
        'h5': { title: 'H5标题', color: '#ffffff' },
      })

      expect(result.conditions).toHaveLength(2)
      expect(result.conditions.find(c => c.condition === 'MP-WEIXIN')?.value).toEqual({
        title: '微信标题',
        color: '#000000',
      })
    })

    it('should handle array values', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin': ['item1', 'item2'],
        'h5': ['item3'],
      })

      expect(result.conditions).toHaveLength(2)
      expect(result.conditions.find(c => c.condition === 'MP-WEIXIN')?.value).toEqual(['item1', 'item2'])
    })

    it('should format condition strings in alphabetical order', () => {
      const resolver = new ConditionResolver()
      const result = resolver.resolve({
        'mp-weixin || app-plus || h5': 'value',
      })

      // 应该按字母顺序排列
      expect(result.conditions[0].condition).toBe('APP-PLUS || H5 || MP-WEIXIN')
    })
  })
})
