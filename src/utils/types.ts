import type { PlatformValue } from '../types/ifdef'

export type MaybePromise<T> = T | Promise<T>
export type MaybeCallable<T> = T | (() => T)
export type MaybePromiseCallable<T> = T | (() => T) | (() => Promise<T>)

/**
 * 使类型可以接受 PlatformValue 包装
 * 用于支持平台条件编译对象字面量
 */
export type MaybeIfdef<T> = T | PlatformValue<T>

export type ExcludeIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K]
}

export type KnownKeys<T> = keyof ExcludeIndexSignature<T>

export type DeepPartial<T> = T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T

/**
 * 深度支持平台条件编译的类型
 * 将对象的所有属性（包括嵌套属性）转换为可接受 PlatformValue 的形式
 */
export type DeepMaybeIfdef<T> = T extends Array<infer U>
  ? Array<DeepMaybeIfdef<U>>
  : T extends object
    ? { [P in keyof T]?: DeepMaybeIfdef<T[P]> }
    : T | PlatformValue<T>
