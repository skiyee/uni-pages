import { defineConfig } from 'uni-pages'

export default defineConfig({
  pages: [
    // pages数组中第一项表示应用启动页，参考：https://uniapp.dcloud.io/collocation/pages
    {
      path: 'pages/index/index',
      style: {},
    },
  ],
  subPackages: [
    {
      root: 'pages-sub',
      pages: [],
      plugins: {
        'uni-id-pages': {
          version: '1.0.0',
          provider: 'https://service-1.pages.dev',
        },
      },
    },
  ],
  globalStyle: {
    navigationBarTextStyle: 'black',
    navigationBarTitleText: {
      'h5': 'uni-app H5',
      'mp-weixin || app-plus': 'uniapp',
      'mp-weixin': 'uni-app 小程序',
      'default': 'uni-app',
    },
    navigationBarBackgroundColor: '#F8F8F8',
    backgroundColor: '#F8F8F8',
  },
})
