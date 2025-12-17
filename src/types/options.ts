export interface UniPagesPluginOptions {
  /**
   * 根目录
   * @default vite.config.* 所在的目录
   */
  root?: string;

  /**
   * 应用目录
   * @default pages.json 所在的目录
   */
  src?: string;

  /**
   * pages 绝对路径或基于 pages.json 的相对路径
   * @default 'pages'
   */
  pageDir?: string;

  /**
   * subPackages 绝对路径或基于 pages.json 的相对路径
   * @default []
   */
  subPackageDirs?: string[];

  /**
   * 排除页面，可排除 主包 或 分包 中的页面文件
   * @example ['pages/exclude.vue', 'sub-pages/exclude/*.vue', 'sub-pages/exclude']
   */
  excludePages?: string[];

  /**
   * 页面路径的 TypeScript 声明，false 时不生成
   * @default "pages.d.ts"
   */
  dts?: string | boolean;

  /**
   * 显示调试
   * @default false
   */
  debug?: boolean | 'info' | 'error' | 'debug' | 'warn';
}

export interface ResolvedPluginOptions extends Required<UniPagesPluginOptions> {
  dts: string | false;
  pagesJsonFilePath: string;
  watchPageFileDirs: string[];
}
