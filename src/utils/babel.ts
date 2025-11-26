import babelGenerator from '@babel/generator'

function getDefaultExport<T = any>(expr: T): T {
  return (expr as any).default === undefined ? expr : (expr as any).default
}

export const babelGenerate = getDefaultExport(babelGenerator)
