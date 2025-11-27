import uni from '@dcloudio/vite-plugin-uni'
import UniPages from 'uni-pages'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    UniPages({
      // pageDir: 'pages',
      subPackageDirs: ['pages-sub'],
      dts: 'types/pages.d.ts',
      debug: true,
      excludePages: ['pages/define-page/**'],
    }),
    uni(),
  ],
})
