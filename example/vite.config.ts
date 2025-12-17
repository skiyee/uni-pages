import uni from '@dcloudio/vite-plugin-uni'
import UniPages from 'uni-pages'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    UniPages({
      subPackageDirs: ['pages-sub'],
      debug: true,
      excludePages: ['pages/exclude/**'],
    }),
    uni(),
  ],
})
