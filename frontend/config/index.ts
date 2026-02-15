import type { UserConfigExport } from '@tarojs/cli'
import path from 'path'

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
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  framework: 'react',
  compiler: {
    type: 'webpack5'
  },
  mini: {
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
