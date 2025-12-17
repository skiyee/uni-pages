import { describe, expect, it } from 'vitest'

import { IfdefJsonGenerator } from '../../src/core/ifdef-json-generator'

describe('IfdefJsonGenerator', () => {
  describe('generate', () => {
    it('should generate simple JSON without platform conditions', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        path: 'pages/index/index',
        style: {
          navigationBarTitleText: '首页',
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('"path": "pages/index/index"')
      expect(result).toContain('"navigationBarTitleText": "首页"')
      expect(result).not.toContain('#ifdef')
      expect(result).not.toContain('#ifndef')
    })

    it('should generate JSON with single platform condition', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        navigationBarTitleText: {
          'mp-weixin': '微信小程序',
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"navigationBarTitleText": "微信小程序"')
      expect(result).toContain('// #endif')
    })

    it('should generate JSON with multiple platform conditions', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        navigationBarTitleText: {
          'mp-weixin': '微信小程序',
          'h5': 'H5应用',
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"navigationBarTitleText": "微信小程序"')
      expect(result).toContain('// #ifdef H5')
      expect(result).toContain('"navigationBarTitleText": "H5应用"')
      // 每个条件都有对应的 #endif
      expect((result.match(/\/\/ #endif/g) || []).length).toBeGreaterThanOrEqual(2)
    })

    it('should generate JSON with combined platform condition', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        title: {
          'mp-weixin || h5': '小程序或H5',
        },
      }

      const result = generator.generate(obj)

      // 组合条件应该按字母顺序排列
      expect(result).toContain('// #ifdef H5 || MP-WEIXIN')
      expect(result).toContain('"title": "小程序或H5"')
    })

    it('should generate JSON with default condition using #ifndef', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        title: {
          'mp-weixin': '微信',
          'default': '默认',
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"title": "微信"')
      expect(result).toContain('// #ifndef MP-WEIXIN')
      expect(result).toContain('"title": "默认"')
    })

    it('should handle nested objects with platform conditions', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        style: {
          navigationBarTitleText: {
            'mp-weixin': '微信标题',
            'h5': 'H5标题',
          },
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('"style"')
      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"navigationBarTitleText": "微信标题"')
      expect(result).toContain('// #ifdef H5')
      expect(result).toContain('"navigationBarTitleText": "H5标题"')
    })

    it('should handle arrays with platform conditions', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        pages: [
          {
            path: 'pages/index/index',
            style: {
              title: {
                'mp-weixin': '首页-微信',
                'h5': '首页-H5',
              },
            },
          },
        ],
      }

      const result = generator.generate(obj)

      expect(result).toContain('"path": "pages/index/index"')
      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('// #ifdef H5')
    })

    it('should handle complex priority resolution', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        title: {
          'mp-weixin': '微信专用',
          'mp-weixin || app-plus': '小程序或APP',
        },
      }

      const result = generator.generate(obj)

      // mp-weixin 被单平台占用，mp-weixin || app-plus 只剩 app-plus
      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"title": "微信专用"')
      expect(result).toContain('// #ifdef APP-PLUS')
      expect(result).toContain('"title": "小程序或APP"')
    })

    it('should use custom indent', () => {
      const generator = new IfdefJsonGenerator()
      const obj = { foo: 'bar' }

      const result = generator.generate(obj, '  ')

      expect(result).toContain('  "foo"')
    })

    it('should use custom EOF', () => {
      const generator = new IfdefJsonGenerator()
      const obj = { foo: 'bar' }

      const resultWithNewline = generator.generate(obj, '    ', '\n')
      const resultWithoutNewline = generator.generate(obj, '    ', '')

      expect(resultWithNewline.endsWith('\n')).toBe(true)
      expect(resultWithoutNewline.endsWith('\n')).toBe(false)
    })

    it('should handle mixed platform and non-platform properties', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        path: 'pages/index/index',
        title: {
          'mp-weixin': '微信',
          'default': '默认',
        },
        enablePullDown: true,
      }

      const result = generator.generate(obj)

      expect(result).toContain('"path": "pages/index/index"')
      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"title": "微信"')
      expect(result).toContain('// #ifndef MP-WEIXIN')
      expect(result).toContain('"enablePullDown": true')
    })

    it('should handle object values in platform conditions', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        style: {
          'mp-weixin': {
            navigationBarTitleText: '微信',
            navigationBarBackgroundColor: '#ffffff',
          },
          'h5': {
            navigationBarTitleText: 'H5',
            navigationBarBackgroundColor: '#000000',
          },
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"navigationBarTitleText": "微信"')
      expect(result).toContain('"navigationBarBackgroundColor": "#ffffff"')
      expect(result).toContain('// #ifdef H5')
      expect(result).toContain('"navigationBarTitleText": "H5"')
    })

    it('should handle empty object', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {}

      const result = generator.generate(obj)

      expect(result.trim()).toBe('{}')
    })

    it('should handle array values', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        items: {
          'mp-weixin': ['a', 'b'],
          'h5': ['c', 'd'],
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('"a"')
      expect(result).toContain('"b"')
      expect(result).toContain('// #ifdef H5')
      expect(result).toContain('"c"')
      expect(result).toContain('"d"')
    })

    it('should handle number values', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        count: {
          'mp-weixin': 10,
          'h5': 20,
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('"count": 10')
      expect(result).toContain('"count": 20')
    })

    it('should handle boolean values', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        enabled: {
          'mp-weixin': true,
          'h5': false,
        },
      }

      const result = generator.generate(obj)

      expect(result).toContain('"enabled": true')
      expect(result).toContain('"enabled": false')
    })

    it('should handle complex real-world scenario', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        pages: [
          {
            path: 'pages/index/index',
            style: {
              navigationBarTitleText: {
                'mp-weixin': '微信首页',
                'h5': 'H5首页',
                'default': '默认首页',
              },
            },
          },
        ],
        globalStyle: {
          navigationBarBackgroundColor: '#F8F8F8',
          navigationBarTextStyle: {
            'mp-weixin': 'black',
            'h5': 'white',
          },
        },
        tabBar: {
          color: '#999999',
          selectedColor: {
            'mp-weixin': '#07c160',
            'default': '#018d71',
          },
        },
      }

      const result = generator.generate(obj)

      // 验证基本结构
      expect(result).toContain('"path": "pages/index/index"')
      expect(result).toContain('"navigationBarBackgroundColor": "#F8F8F8"')
      expect(result).toContain('"color": "#999999"')

      // 验证条件编译注释
      expect(result).toContain('// #ifdef MP-WEIXIN')
      expect(result).toContain('// #ifdef H5')
      expect(result).toContain('// #ifndef')
      expect(result).toContain('// #endif')
    })

    it('should handle three-platform default exclusion', () => {
      const generator = new IfdefJsonGenerator()
      const obj = {
        title: {
          'mp-weixin': '微信',
          'h5': 'H5',
          'app-plus': 'APP',
          'default': '其他',
        },
      }

      const result = generator.generate(obj)

      // default 应该排除所有三个平台
      expect(result).toContain('// #ifndef APP-PLUS || H5 || MP-WEIXIN')
    })
  })
})