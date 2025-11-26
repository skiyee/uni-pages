import path from 'node:path';
import { normalizePath } from 'vite';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../-src/config';
import { Context } from '../-src/context';

const cfg = resolveConfig({
  root: path.resolve(__dirname, '../playground'),
  pageDir: 'pages',
  subPackageDirs: ['pages-sub'],
});

const ctx = new Context(cfg);

describe('get files', () => {
  it('pages files', async () => {
    await ctx.scanFiles();
    const pages = await ctx.getPageFileOfPages();
    const files = pages.map(page => normalizePath(path.relative(cfg.root, page.file))).sort();
    expect(files).toMatchInlineSnapshot(`
      [
        "src/pages/define-page/async-function.vue",
        "src/pages/define-page/function.vue",
        "src/pages/define-page/nested-function.vue",
        "src/pages/define-page/object.vue",
        "src/pages/define-page/option-api.vue",
        "src/pages/define-page/yaml.vue",
        "src/pages/index/index.vue",
      ]
    `);
  });

  it('sub packages files', async () => {
    await ctx.scanFiles();

    const files: string[] = [];
    const subPackages = await ctx.getPageFileOfSubPackages();

    for (const page of subPackages) {
      files.push(normalizePath(path.relative(cfg.root, page.file)));
    }

    files.sort();
    expect(files).toMatchInlineSnapshot(`
      [
        "src/pages-sub/about/index.vue",
        "src/pages-sub/about/your.vue",
        "src/pages-sub/index.vue",
      ]
    `);
  });
});
