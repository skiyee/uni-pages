import { describe, expect, it } from 'vitest'

import { parseCode } from '../../src/utils/parser'

describe('parseCode', () => {
  it('should parse simple object export', async () => {
    const code = `export default { foo: 1, bar: 'hello' }`
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ foo: 1, bar: 'hello' })
  })

  it('should parse TypeScript code', async () => {
    const code = `
      interface Config {
        foo: number;
        bar: string;
      }
      const config: Config = { foo: 42, bar: 'test' };
      export default config;
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ foo: 42, bar: 'test' })
  })

  it('should parse nested objects', async () => {
    const code = `
      export default {
        level1: {
          level2: {
            value: 'deep'
          }
        }
      }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({
      level1: {
        level2: {
          value: 'deep',
        },
      },
    })
  })

  it('should parse arrays', async () => {
    const code = `export default { items: [1, 2, 3] }`
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ items: [1, 2, 3] })
  })

  it('should parse computed values', async () => {
    const code = `
      const base = 10;
      export default { value: base * 2 }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ value: 20 })
  })

  it('should parse template literals', async () => {
    const code = `
      const name = 'World';
      export default { greeting: \`Hello, \${name}!\` }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ greeting: 'Hello, World!' })
  })

  it('should parse spread operators', async () => {
    const code = `
      const base = { foo: 1, bar: 2 };
      export default { ...base, baz: 3 }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ foo: 1, bar: 2, baz: 3 })
  })

  it('should parse function expressions', async () => {
    const code = `
      const getValue = () => 42;
      export default { value: getValue() }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ value: 42 })
  })

  it('should parse imported values (inline)', async () => {
    const code = `
      const config = {
        pages: [
          { path: 'pages/index/index' },
          { path: 'pages/about/index' }
        ]
      };
      export default config;
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({
      pages: [
        { path: 'pages/index/index' },
        { path: 'pages/about/index' },
      ],
    })
  })

  it('should throw error for invalid code', async () => {
    const code = `export default { invalid syntax `

    await expect(parseCode({ code, filename: 'test.ts' })).rejects.toThrow()
  })

  it('should handle empty export', async () => {
    const code = `export default {}`
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({})
  })

  it('should handle boolean values', async () => {
    const code = `export default { enabled: true, disabled: false }`
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ enabled: true, disabled: false })
  })

  it('should handle null and undefined', async () => {
    const code = `export default { nullValue: null, undefinedValue: undefined }`
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result.nullValue).toBeNull()
    expect(result.undefinedValue).toBeUndefined()
  })

  it('should parse conditional expressions', async () => {
    const code = `
      const condition = true;
      export default { value: condition ? 'yes' : 'no' }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ value: 'yes' })
  })

  it('should parse shorthand properties', async () => {
    const code = `
      const foo = 1;
      const bar = 2;
      export default { foo, bar }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({ foo: 1, bar: 2 })
  })

  it('should handle complex page meta configuration', async () => {
    const code = `
      export default {
        path: 'pages/index/index',
        style: {
          navigationBarTitleText: '首页',
          navigationBarBackgroundColor: '#ffffff',
          enablePullDownRefresh: true
        },
        tabbar: {
          index: 0,
          text: '首页',
          iconPath: 'static/tabbar/home.png',
          selectedIconPath: 'static/tabbar/home-selected.png'
        }
      }
    `
    const result = await parseCode({ code, filename: 'test.ts' })

    expect(result).toEqual({
      path: 'pages/index/index',
      style: {
        navigationBarTitleText: '首页',
        navigationBarBackgroundColor: '#ffffff',
        enablePullDownRefresh: true,
      },
      tabbar: {
        index: 0,
        text: '首页',
        iconPath: 'static/tabbar/home.png',
        selectedIconPath: 'static/tabbar/home-selected.png',
      },
    })
  })
})