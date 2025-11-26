import { defineConfig } from 'uni-pages'

export default defineConfig(({ platform }) => {
  return {
    globalStyle: {
      navigationBarTextStyle: 'black',
      navigationBarTitleText: platform === 'h5' ? 'uni-app H5' : 'pages.config',
      navigationBarBackgroundColor: '#F8F8F8',
      backgroundColor: '#F8F8F8',
    },
    pages: [ // pages数组中第一项表示应用启动页，参考：https://uniapp.dcloud.io/collocation/pages
      {
        path: 'pages/index/index',
        style: {
          navigationBarTitleText: 'uni-app 3',
        },
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
  }
})
