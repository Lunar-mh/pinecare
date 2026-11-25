import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'

type Props = React.PropsWithChildren<{
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}>

type State = {
  hasError: boolean
  error: Error | null
  errorInfo: string
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: '',
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 记录错误信息
    const errorMessage = `${error.name}: ${error.message}\n${errorInfo.componentStack || ''}`
    this.setState({ errorInfo: errorMessage })
    
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught render error', error, errorInfo)
    
    // 调用外部错误处理器
    this.props.onError?.(error, errorInfo)
    
    // TODO: 生产环境可以上报到错误监控平台
    // reportError({ error, errorInfo, page: Taro.getCurrentPages() })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' })
  }

  handleGoHome = () => {
    Taro.reLaunch({ url: '/pages/index/index' })
  }

  handleReload = () => {
    // 小程序重新加载当前页面
    const pages = Taro.getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage) {
      const route = currentPage.route
      const options = currentPage.options || {}
      const query = Object.keys(options)
        .map(key => `${key}=${options[key]}`)
        .join('&')
      Taro.redirectTo({ url: `/${route}${query ? '?' + query : ''}` })
    } else {
      this.handleGoHome()
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    // 支持自定义fallback
    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <View className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          {/* 错误图标 */}
          <View className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <Text className="text-4xl">⚠️</Text>
          </View>
          
          <Text className="text-xl font-bold text-gray-900 block mb-2">
            页面出现异常
          </Text>
          <Text className="text-base text-gray-500 block mb-6">
            抱歉，页面遇到了问题。您可以尝试重试或返回首页。
          </Text>
          
          {/* 操作按钮 */}
          <View className="space-y-3">
            <Button
              className="w-full py-3 bg-yinban-primary text-white rounded-xl text-lg font-medium"
              onClick={this.handleRetry}
            >
              重试
            </Button>
            <Button
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-lg font-medium"
              onClick={this.handleReload}
            >
              刷新页面
            </Button>
            <Button
              className="w-full py-3 bg-transparent text-gray-500 text-base"
              onClick={this.handleGoHome}
            >
              返回首页
            </Button>
          </View>
          
          {/* 开发环境显示错误详情 */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <View className="mt-6 p-4 bg-gray-100 rounded-xl text-left">
              <Text className="text-base text-red-600 font-mono block break-all">
                {this.state.error.toString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }
}
