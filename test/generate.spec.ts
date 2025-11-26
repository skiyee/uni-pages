import path from 'node:path';
import { stringify as cjStringify } from 'comment-json';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../-src/config';
import { Context } from '../-src/context';

const cfg = resolveConfig({
  root: path.resolve(__dirname, '../playground'),
  pageDir: 'pages',
  subPackageDirs: ['pages-sub'],
});

const ctx = new Context(cfg);

describe('generate', () => {
  it('pages snapshot', async () => {
    await ctx.scanFiles();
    const pages = await ctx.generatePages();

    const raw = cjStringify(pages, null, 2);

    expect(raw).toMatchInlineSnapshot(`
      "[
        {
          "path": "pages/define-page/async-function",
          "style": {
            "navigationBarTitleText": "hello world from async"
          }
        },
        {
          "path": "pages/define-page/function",
          "style": {
            "navigationBarTitleText": "hello from undefined"
          }
        },
        {
          "path": "pages/define-page/nested-function",
          "style": {
            "navigationBarTitleText": "hello world"
          }
        },
        {
          "path": "pages/define-page/object",
          "style": {
            "navigationBarTitleText": "hello world"
          }
        },
        {
          "path": "pages/define-page/option-api",
          "style": {
            "navigationBarTitleText": "Option API 内使用 definePage"
          }
        },
        {
          "path": "pages/define-page/yaml",
          "style": {
            "navigationBarTitleText": "yaml test"
          }
        },
        {
          "path": "pages/index/index",
          "style": {
            "animationType": "pop-in"
          }
        }
      ]"
    `);
  });

  it('subPackages snapshot', async () => {
    await ctx.scanFiles();
    const subPackages = await ctx.generateSubPackages();

    const raw = cjStringify(subPackages, null, 2);
    expect(raw).toMatchInlineSnapshot(`
      "[
        {
          "root": "pages-sub",
          "pages": [
            {
              "path": "index"
            },
            {
              "path": "about/index"
            },
            {
              "path": "about/your"
            }
          ]
        }
      ]"
    `);
  });

  it('tabBar snapshot', async () => {
    await ctx.scanFiles();
    const tabbarItems = await ctx.generateTabbarItems();

    const raw = cjStringify(tabbarItems, null, 2);
    expect(raw).toMatchInlineSnapshot(`
      "[
        {
          "pagePath": "pages/define-page/object"
        }
      ]"
    `);
  });
});
