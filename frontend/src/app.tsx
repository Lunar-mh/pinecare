import '@nutui/icons-react-taro/dist/style_icon.css'
import './app.scss'

import { PropsWithChildren, useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import ErrorBoundary from './components/ErrorBoundary'

export default function App(props: PropsWithChildren) {
  const [initing, setIniting] = useState(true)

  useEffect(() => {
    // 冷启动强拦截：每次启动应用，如果距离上次选择超过30分钟，重新选择
    const checkRoleAndAuth = async () => {
      try {
        const token = Taro.getStorageSync('token')

        if (!token) {
          Taro.reLaunch({ url: '/pages/login/index' })
          return
        }

        const role = Taro.getStorageSync('userRole')
        const lastSelectedTime = Taro.getStorageSync('roleSelectTime')
        const now = Date.now()

        if (!role || (now - (lastSelectedTime || 0) > 30 * 60 * 1000)) {
          Taro.reLaunch({ url: '/pages/role-select/index' })
          return
        }

        const pages = Taro.getCurrentPages()
        if (pages.length === 0 || pages[0].route === 'pages/index/index') {
            if (role === 'family') {
                Taro.reLaunch({ url: '/pages/dashboard/index' })
            }
        }

        Taro.showToast({
          title: '正在以' + (role === "elder" ? "长辈" : "家属") + '模式运行',
          icon: 'none',
          duration: 2000
        })

      } finally {
        setIniting(false)
      }
    }

    checkRoleAndAuth()
  }, [])

  return <ErrorBoundary>{props.children}</ErrorBoundary>
}
