import type { UserConfigExport } from '@tarojs/cli'
import path from 'path'

// 添加 weapp-tailwindcss 的 webpack 插件
const { UnifiedWebpackPluginV5 } = require('weapp-tailwindcss/webpack')

const config: UserConfigExport = {
  projectName: 'yinban-frontend',
  date: '2026-02-19',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  plugins: ['@tarojs/plugin-platform-weapp', '@tarojs/plugin-framework-react'],
  defineConstants: {
    '__TARO_APP_API_BASE_URL__': JSON.stringify(process.env.TARO_APP_API_BASE_URL || ''),
  },
  copy: {
    patterns: [],
    options: {}
  },
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false
    }
  },
  mini: {
    miniCssExtractPluginOption: {
      ignoreOrder: true,
    },
    webpackChain(chain, webpack) {
      // 注册 weapp-tailwindcss 插件以处理小程序的特殊选择器和语法
      chain.plugin('weapp-tailwindcss').use(UnifiedWebpackPluginV5, [
        {
          appType: 'taro',
          cssEntries: [path.resolve(__dirname, '..', 'src/app.scss')],
        }
      ])
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          designWidth: 375
        }
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  }
}

export default config
