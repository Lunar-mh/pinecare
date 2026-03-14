import React from 'react'
import { View, Text } from '@tarojs/components'

type Props = React.PropsWithChildren

type State = {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught render error', error)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <View className="global-error-boundary">
        <View className="global-error-boundary__card">
          <Text className="global-error-boundary__title">页面出现异常</Text>
          <Text className="global-error-boundary__desc">请重新打开页面或稍后再试</Text>
        </View>
      </View>
    )
  }
}
