---
title: Uni Pages
description: 在 UniApp 中通过 definePageMeta 一键定义页面参数
---

::u-page-hero
---
orientation: horizontal
---
#top
:stars-bg

#title
Uni [Pages]{.text-primary}

#description
在 UniApp 中通过 definePageMeta 一键定义页面参数

#links
  ::u-button
  ---
  label: 开始使用
  to: /pages/docs/guide/introduction
  icon: i-lucide-book-open
  size: lg
  ---
  ::
  ::u-button
  ---
    label: GitHub
    to: https://github.com/skiyee/uni-pages
    icon: i-simple-icons-github
    size: lg
    color: neutral
    variant: outline
    target: _blank
  ---
  ::

#default
  ::code-group
    :::prose-pre
    ---
    code: |
      <script setup lang="ts">
      definePageMeta({
        style: {
          navigationBarTitleText: '首页',
          navigationBarBackgroundColor: '#ffffff',
          enablePullDownRefresh: true
        }
      })
      </script>

      <template>
        <text>Hello UniApp</text>
      </template>
    filename: pages/index/index.vue
    ---
    ```vue [pages/index/index.vue]
    <script setup lang="ts">
    definePageMeta({
      style: {
        navigationBarTitleText: '首页',
        navigationBarBackgroundColor: '#ffffff',
        enablePullDownRefresh: true
      }
    })
    </script>

    <template>
      <text>Hello UniApp</text>
    </template>
    ```
    :::
    :::prose-pre
    ---
    code: |
      import Uni from '@dcloudio/vite-plugin-uni'
      import UniPages from 'uni-pages'
      import { defineConfig } from 'vite'

      export default defineConfig({
        plugins: [
          UniPages(),
          Uni(),
        ]
      })
    filename: vite.config.ts
    ---
    ```ts [vite.config.ts]
    import uni from '@dcloudio/vite-plugin-uni'
    import UniPages from 'uni-pages'
    import { defineConfig } from 'vite'

    export default defineConfig({
      plugins: [
        UniPages(),
        uni(),
      ]
    })
    ```
    :::
  ::
::

::u-page-section
---
title: 核心特性
description: 为 UniApp 开发者打造的最佳页面配置体验
---
  ::u-page-grid
    ::u-page-card
    ---
    title: 宏式定义
    description: 使用 definePageMeta 宏来定义页面参数，语义清晰，代码与配置同源，维护更轻松。
    icon: i-lucide-code-2
    ---
    ::
    
    ::u-page-card
    ---
    title: 智能提示
    description: 提供完整的 TypeScript 类型定义，编写配置时享受丝滑的智能补全和类型检查。
    icon: i-lucide-braces
    ---
    ::
    
    ::u-page-card
    ---
    title: 极致热更
    description: 修改页面配置实时生效，无需重启服务，让你的开发体验如丝般顺滑。
    icon: i-lucide-zap
    ---
    ::
    
    ::u-page-card
    ---
    title: 全局管控
    description: 支持 pages.config.ts 全局配置文件，统一管理项目级页面配置，告别重复劳动。
    icon: i-lucide-settings-2
    ---
    ::
    
    ::u-page-card
    ---
    title: 现代生态
    description: 完美支持 Node 20+ 及最新的 Vite 生态，紧跟技术前沿，拒绝过时依赖。
    icon: i-lucide-box
    ---
    ::
    
    ::u-page-card
    ---
    title: 按需构建
    description: 自动分析页面依赖，智能生成 pages.json，让你的构建产物更纯净。
    icon: i-lucide-layers
    ---
    ::
  ::
::

::u-page-section
  :::u-page-c-t-a
  ---
  title: 准备好开始了吗？
  description: 立即安装 uni-pages，让页面配置变得简单而优雅。
  links:
    - label: 开始使用
      to: /pages/docs/guide/introduction
      icon: i-lucide-arrow-right
      size: lg
  ---
  :::
::