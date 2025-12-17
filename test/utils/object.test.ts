import { describe, expect, it } from 'vitest'

import { deepAssign, deepCopy, deepMerge } from '../../src/utils/object'

describe('deepMerge', () => {
  it('should merge two simple objects', () => {
    const a = { foo: 1 }
    const b = { bar: 2 }
    const result = deepMerge(a, b)

    expect(result).toEqual({ foo: 1, bar: 2 })
  })

  it('should override values with later sources', () => {
    const a = { foo: 1 }
    const b = { foo: 2 }
    const result = deepMerge(a, b)

    expect(result).toEqual({ foo: 2 })
  })

  it('should deep merge nested objects', () => {
    const a = { nested: { foo: 1, bar: 2 } }
    const b = { nested: { bar: 3, baz: 4 } }
    const result = deepMerge(a, b)

    expect(result).toEqual({ nested: { foo: 1, bar: 3, baz: 4 } })
  })

  it('should handle multiple sources', () => {
    const a = { foo: 1 }
    const b = { bar: 2 }
    const c = { baz: 3 }
    const result = deepMerge(a, b, c)

    expect(result).toEqual({ foo: 1, bar: 2, baz: 3 })
  })

  it('should return empty object when no sources provided', () => {
    const result = deepMerge()

    expect(result).toEqual({})
  })

  it('should handle null and undefined values in sources', () => {
    const a = { foo: 1 }
    const b = { foo: null }
    const result = deepMerge(a, b)

    expect(result).toEqual({ foo: null })
  })

  it('should not mutate original objects', () => {
    const a = { foo: 1, nested: { bar: 2 } }
    const b = { foo: 2, nested: { baz: 3 } }
    const aCopy = JSON.parse(JSON.stringify(a))
    const bCopy = JSON.parse(JSON.stringify(b))

    deepMerge(a, b)

    expect(a).toEqual(aCopy)
    expect(b).toEqual(bCopy)
  })

  it('should handle array values (replace, not merge)', () => {
    const a = { arr: [1, 2, 3] }
    const b = { arr: [4, 5] }
    const result = deepMerge(a, b)

    expect(result).toEqual({ arr: [4, 5] })
  })
})

describe('deepCopy', () => {
  it('should copy primitive values', () => {
    expect(deepCopy(1)).toBe(1)
    expect(deepCopy('hello')).toBe('hello')
    expect(deepCopy(true)).toBe(true)
    expect(deepCopy(null)).toBe(null)
    expect(deepCopy(undefined)).toBe(undefined)
  })

  it('should copy simple objects', () => {
    const obj = { foo: 1, bar: 'hello' }
    const copy = deepCopy(obj)

    expect(copy).toEqual(obj)
    expect(copy).not.toBe(obj)
  })

  it('should copy nested objects', () => {
    const obj = { foo: { bar: { baz: 1 } } }
    const copy = deepCopy(obj)

    expect(copy).toEqual(obj)
    expect(copy.foo).not.toBe(obj.foo)
    expect(copy.foo.bar).not.toBe(obj.foo.bar)
  })

  it('should copy arrays', () => {
    const arr = [1, 2, 3]
    const copy = deepCopy(arr)

    expect(copy).toEqual(arr)
    expect(copy).not.toBe(arr)
  })

  it('should copy nested arrays', () => {
    const arr = [[1, 2], [3, 4]]
    const copy = deepCopy(arr)

    expect(copy).toEqual(arr)
    expect(copy[0]).not.toBe(arr[0])
  })

  it('should copy Date objects', () => {
    const date = new Date('2024-01-01')
    const copy = deepCopy(date)

    expect(copy).toEqual(date)
    expect(copy).not.toBe(date)
    expect(copy.getTime()).toBe(date.getTime())
  })

  it('should copy Set objects', () => {
    const set = new Set([1, 2, 3])
    const copy = deepCopy(set)

    expect(copy).toEqual(set)
    expect(copy).not.toBe(set)
    expect([...copy]).toEqual([...set])
  })

  it('should copy Map objects', () => {
    const map = new Map([['a', 1], ['b', 2]])
    const copy = deepCopy(map)

    expect(copy).toEqual(map)
    expect(copy).not.toBe(map)
    expect(copy.get('a')).toBe(1)
    expect(copy.get('b')).toBe(2)
  })

  it('should copy RegExp objects', () => {
    const regex = /test/gi
    const copy = deepCopy(regex)

    expect(copy.source).toBe(regex.source)
    expect(copy.flags).toBe(regex.flags)
    expect(copy).not.toBe(regex)
  })

  it('should copy objects with Symbol properties', () => {
    const sym = Symbol('test')
    const obj = { [sym]: 'value', foo: 'bar' }
    const copy = deepCopy(obj)

    expect(copy[sym]).toBe('value')
    expect(copy.foo).toBe('bar')
    expect(copy).not.toBe(obj)
  })

  it('should handle mixed nested structures', () => {
    const obj = {
      array: [1, { nested: true }],
      date: new Date('2024-01-01'),
      set: new Set([1, 2]),
      map: new Map([['key', 'value']]),
    }
    const copy = deepCopy(obj)

    expect(copy).toEqual(obj)
    expect(copy.array).not.toBe(obj.array)
    expect(copy.array[1]).not.toBe(obj.array[1])
    expect(copy.date).not.toBe(obj.date)
    expect(copy.set).not.toBe(obj.set)
    expect(copy.map).not.toBe(obj.map)
  })
})

describe('deepAssign', () => {
  it('should assign properties to target object', () => {
    const target = { foo: 1 }
    const source = { bar: 2 }
    const result = deepAssign(target, source)

    expect(result).toBe(target)
    expect(result).toEqual({ foo: 1, bar: 2 })
  })

  it('should override existing properties', () => {
    const target = { foo: 1 }
    const source = { foo: 2 }
    const result = deepAssign(target, source)

    expect(result.foo).toBe(2)
  })

  it('should deep assign nested objects', () => {
    const target = { nested: { foo: 1, bar: 2 } }
    const source = { nested: { bar: 3, baz: 4 } }
    const result = deepAssign(target, source)

    expect(result.nested).toEqual({ foo: 1, bar: 3, baz: 4 })
  })

  it('should handle multiple sources', () => {
    const target = { foo: 1 }
    const source1 = { bar: 2 }
    const source2 = { baz: 3 }
    const result = deepAssign(target, source1, source2)

    expect(result).toEqual({ foo: 1, bar: 2, baz: 3 })
  })

  it('should mutate the target object', () => {
    const target = { foo: 1 }
    const source = { bar: 2 }
    deepAssign(target, source)

    expect(target).toEqual({ foo: 1, bar: 2 })
  })

  it('should skip null and undefined sources', () => {
    const target = { foo: 1 }
    const result = deepAssign(target, null, undefined, { bar: 2 })

    expect(result).toEqual({ foo: 1, bar: 2 })
  })

  it('should handle Symbol keys', () => {
    const sym = Symbol('test')
    const target = {}
    const source = { [sym]: 'value' }
    const result = deepAssign(target, source)

    expect(result[sym]).toBe('value')
  })

  it('should create new nested objects when target does not have them', () => {
    const target = {}
    const source = { nested: { foo: 1 } }
    const result = deepAssign(target, source)

    expect(result).toEqual({ nested: { foo: 1 } })
    expect((result as any).nested).not.toBe(source.nested)
  })
})