import fs from 'node:fs'

import { dirname } from 'pathe'
import lockfile from 'proper-lockfile'

import { logger } from './debug'

export async function writeFileWithLock(path: string, content: string, retry = 3) {
  let release: () => Promise<void> | undefined

  try {
    try {
      release = await lockfile.lock(path, { realpath: false }) // 获取文件锁
    }
    catch (err: any) { // 获取文件锁失败
      const nextRetry = retry - 1
      if (nextRetry <= 0) {
        logger.error(`${path} 获取文件锁失败，写入失败: ${err.message}`)
        throw err
      }
      await new Promise(resolve => setTimeout(resolve, 500))
      return writeFileWithLock(path, content, nextRetry)
    }
    await fs.promises.writeFile(path, content, { encoding: 'utf-8' }) // 执行写入操作
  }
  finally {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error'
    if (release) {
      await release() // 释放文件锁
    }
  }
}

/**
 * 检查指定路径的文件，如果文件不存在或不是有效文件则根据是否指定新文件内容创建新的文件
 *
 * @param opt - 配置选项
 * @param opt.path - 要检查的文件路径
 * @param opt.newContent - 新文件的内容。指定后，文件不存在将尝试以指定内容创建文件
 * @param opt.modeFlag - 访问标识。指定后，文件权限不存在则根据是否指定新内容进行创建文件或返回 false
 * @returns 操作是否成功
 */
export async function checkFile(opt: { path: fs.PathLike; newContent?: string; modeFlag?: number }): Promise<boolean> {
  try {
    // 检查文件是否存在且为文件
    const stat = await fs.promises.stat(opt.path)
    if (!stat.isFile()) {
      // 存在但不是文件，删除它
      await fs.promises.unlink(opt.path)
      throw new Error('Not a file') // 抛出错误，进入 catch 流程
    }

    if (opt.modeFlag !== undefined) {
      // 检查是否有权限
      try {
        await fs.promises.access(opt.path, opt.modeFlag)
      }
      catch {
        if (opt.newContent !== undefined) {
          // 文件权限更新失败，尝试删除文件
          try {
            await fs.promises.unlink(opt.path)
          }
          catch {
            return false // 删除失败，直接返回 false
          }
          throw new Error('Permission error') // 抛出错误，进入 catch 流程
        }
        else {
          return false
        }
      }
    }
    return true
  }
  catch { // 文件不存在或不是有效文件或权限不足，需要重新创建
    if (opt.newContent !== undefined) {
      try {
        // 确保目录存在
        await fs.promises.mkdir(dirname(opt.path.toString()), { recursive: true })
        // 创建文件
        const mode = opt.modeFlag === undefined
          ? undefined
          : opt.modeFlag << 6 | opt.modeFlag << 3 | opt.modeFlag
        await fs.promises.writeFile(opt.path, opt.newContent, { encoding: 'utf-8', mode })
        return true
      }
      catch {
        return false
      }
    }
    else {
      return false
    }
  }
}

/**
 * 检查指定路径的文件，如果文件不存在或不是有效文件则根据是否指定新文件内容创建新的文件
 *
 * @param opt - 配置选项
 * @param opt.path - 要检查的文件路径
 * @param opt.newContent - 新文件的内容。指定后，文件不存在将尝试以指定内容创建文件
 * @param opt.modeFlag - 访问标识。指定后，文件权限不存在则根据是否指定新内容进行创建文件或返回 false
 * @returns 操作是否成功
 */
export function checkFileSync(opt: { path: fs.PathLike; newContent?: string; modeFlag?: number }): boolean {
  try {
    // 检查文件是否存在且为文件
    const stat = fs.statSync(opt.path)
    if (!stat.isFile()) {
      // 存在但不是文件，删除它
      fs.unlinkSync(opt.path)
      throw new Error('Not a file') // 抛出错误，进入 catch 流程
    }

    if (opt.modeFlag !== undefined) {
      // 检查是否有权限
      try {
        fs.accessSync(opt.path, opt.modeFlag)
      }
      catch {
        if (opt.newContent !== undefined) {
          // 文件权限更新失败，尝试删除文件
          try {
            fs.unlinkSync(opt.path)
          }
          catch {
            return false // 删除失败，直接返回 false
          }
          throw new Error('Permission error') // 抛出错误，进入 catch 流程
        }
        else {
          return false
        }
      }
    }
    return true
  }
  catch {
    // 文件不存在或不是有效文件或权限不足，需要重新创建
    if (opt.newContent !== undefined) {
      try {
        // 确保目录存在
        fs.mkdirSync(dirname(opt.path.toString()), { recursive: true })
        // 创建文件
        const mode = opt.modeFlag === undefined
          ? undefined
          : opt.modeFlag << 6 | opt.modeFlag << 3 | opt.modeFlag
        fs.writeFileSync(opt.path, opt.newContent, { encoding: 'utf-8', mode })
        return true
      }
      catch {
        return false
      }
    }
    else {
      return false
    }
  }
}
