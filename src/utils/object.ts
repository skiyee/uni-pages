export function deepMerge<T extends Record<string, any> = Record<string, any>>(...sources: T[]): T {
  if (sources.length === 0) {
    return {} as T
  }

  return sources.reduce((acc, source) => {
    if (!isObject(source)) {
      return acc
    }

    Object.keys(source).forEach((key) => {
      const accValue = acc[key]
      const sourceValue = source[key]

      if (isObject(accValue) && isObject(sourceValue)) {
        (acc as any)[key] = deepMerge(accValue as T, sourceValue as T)
      }
      else {
        // 基础条件：直接用源对象的值覆盖累加结果的值
        (acc as any)[key] = sourceValue
      }
    })

    return acc
  }, {} as T) // 初始值是一个空对象
}

export function deepAssign<T extends object, U extends any[]>(
  target: T,
  ...sources: U
): T & U[number] {
  const seen = new WeakMap()

  const merge = (currentTarget: any, source: any) => {
    if (!isObject(source)) {
      return
    }

    seen.set(source, currentTarget)

    for (const key of Reflect.ownKeys(source)) {
      const sourceVal = source[key]
      const targetVal = currentTarget[key]

      if (isObject(sourceVal)) {
        if (seen.has(sourceVal)) {
          currentTarget[key] = seen.get(sourceVal)
          continue
        }

        if (isObject(targetVal)) {
          merge(targetVal, sourceVal)
        }
        else {
          const newObject = {}
          seen.set(sourceVal, newObject)
          merge(newObject, sourceVal)
          currentTarget[key] = newObject
        }
      }
      else {
        currentTarget[key] = sourceVal
      }
    }
  }

  for (const source of sources) {
    if (source) {
      merge(target, source)
    }
  }

  return target as T & U[number]
}

export function deepCopy<T>(obj: T): T {
  // 处理原始类型
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // 使用更可靠的类型检查
  const objType = Object.prototype.toString.call(obj)

  // 处理 Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as T
  }

  // 处理 Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  // 处理 Set
  if (obj instanceof Set) {
    const copy = new Set()
    obj.forEach((value) => {
      copy.add(deepCopy(value))
    })
    return copy as T
  }

  // 处理 Map
  if (obj instanceof Map) {
    const copy = new Map()
    obj.forEach((value, key) => {
      copy.set(deepCopy(key), deepCopy(value))
    })
    return copy as T
  }

  // 处理 RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T
  }

  // 处理普通对象（包括 Object.create(null) 创建的对象）
  if (objType === '[object Object]') {
    const copy = {} as T

    // 复制所有自有属性（包括不可枚举的，如果需要的话）
    const allKeys = [
      ...Object.getOwnPropertyNames(obj),
      ...Object.getOwnPropertySymbols(obj),
    ]

    for (const key of allKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, key)
      if (descriptor) {
        if (descriptor.value !== undefined) {
          // 数据属性
          Object.defineProperty(copy, key, {
            ...descriptor,
            value: deepCopy(descriptor.value),
          })
        }
        else {
          // 访问器属性
          Object.defineProperty(copy, key, descriptor)
        }
      }
    }

    return copy
  }

  // 其他未处理的类型直接返回
  return obj
}

function isObject(item: any) {
  return item && typeof item === 'object' && !Array.isArray(item)
}
