import { pathToFileURL } from 'node:url'

import { transformSync } from 'esbuild'
import { evalModule } from 'mlly'

interface ParseCodeOptions {
  code: string;
  filename: string;
}

/**
 * 将 TypeScript / JavaScript 脚本代码转换为对象
 * 使用 esbuild 编译 + mlly evalModule 执行
 *
 * @param options - 执行脚本所需的配置项
 * @param options.code - 要执行的脚本代码，必须要有 export default
 * @param options.filename - 脚本文件名
 * @returns 返回脚本执行后的结果
 */
export async function parseCode({ code, filename }: ParseCodeOptions): Promise<any> {
  let jsCode: string = ''

  try {
    // 使用 esbuild 编译 TypeScript -> ESM JavaScript
    const transformResult = transformSync(code, {
      loader: 'ts',
      format: 'esm',
      target: 'es2022',
    })
    jsCode = transformResult.code

    // 将文件路径转换为 file:// URL 格式
    const fileUrl = pathToFileURL(filename).href

    // 使用 mlly evalModule 执行代码
    const moduleResult = await evalModule(jsCode, { url: fileUrl })

    // 获取 default export
    const result = moduleResult.default ?? moduleResult

    return result
  }
  catch (error: any) {
    throw new Error(`EXEC SCRIPT FAIL IN ${filename}: ${error.message} \n\n${jsCode}\n\n`)
  }
}
