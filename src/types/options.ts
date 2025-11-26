export interface UniPagesPluginOptions {
  /**
   * 项目根目录
   * @default process.env.UNI_CLI_CONTEXT || process.cwd()
   */
  root?: string;

  /**
   * 源码目录，pages.json 放置的目录
   * @default process.env.UNI_INPUT_DIR || path.resolve(root, 'src') || root
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
   * 排除条件，应用于 pages 和 subPackages 的文件
   * @default ['node_modules', '.git', '** /__*__/ **']
   */
  excludeDirs?: string[];

  /**
   * 为页面路径生成 TypeScript 声明
   * 绝对路径或基于 根目录 的相对路径
   * false 则取消生成
   * @default "pages.d.ts"
   */
  dts?: string | boolean;

  /**
   * 显示调试
   * @default false
   */
  debug?: boolean | 'info' | 'error' | 'debug' | 'warn';

  /**
   * 过滤、修改 pages 的页面文件信息
   */
  // filterPages?: (opt: { filePath: string; platform: BuiltInPlatform }) => boolean;
}

export interface ResolvedPluginOptions extends Required<UniPagesPluginOptions> {
  dts: string | false;
  pagesJsonFilePath: string;
  pagesConfigFilePath: string;
}
