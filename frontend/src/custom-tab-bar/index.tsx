import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { Component } from 'react'
import Icon, { IconName } from '../components/icons'
import './index.scss'

interface TabItem {
  pagePath: string
  text: string
  iconName: IconName
}

interface CustomTabBarState {
  selected: number
  role: 'elder' | 'family'
}

/**
 * 悬浮微晶药丸底部导航坞 (Floating Pill Dock)
 * 通透润白微晶材质，双模式动态切换，纯矢量图标，翡翠高光底衬与短震动反馈
 */
export default class CustomTabBar extends Component<{}, CustomTabBarState> {
  state: CustomTabBarState = {
    selected: 0,
    role: (Taro.getStorageSync('userRole') as 'elder' | 'family') || 'elder',
  }

  componentDidMount() {
    this.syncRole()
    Taro.eventCenter.on('app:roleChange', this.handleRoleChange)
  }

  componentWillUnmount() {
    Taro.eventCenter.off('app:roleChange', this.handleRoleChange)
  }

  handleRoleChange = (newRole: 'elder' | 'family') => {
    if (newRole && (newRole === 'elder' || newRole === 'family')) {
      this.setState({ role: newRole })
    }
  }

  syncRole = () => {
    try {
      const stored = Taro.getStorageSync('userRole') as 'elder' | 'family'
      if (stored && stored !== this.state.role) {
        this.setState({ role: stored })
      }
    } catch (_) {}
  }

  setSelected(idx: number) {
    this.setState({ selected: idx })
  }

  switchTab = (index: number, url: string) => {
    try {
      Taro.vibrateShort({ type: 'light' })
    } catch (_) {}

    this.syncRole()
    this.setSelected(index)
    Taro.switchTab({ url })
  }

  render() {
    const { selected, role } = this.state

    // 长辈端模式 (3 大核心入口，32px 矢量图标，16px 粗体)
    const elderList: TabItem[] = [
      { pagePath: '/pages/index/index', text: '首页', iconName: 'home' },
      { pagePath: '/pages/services/index', text: '健康陪伴', iconName: 'heart' },
      { pagePath: '/pages/profile/index', text: '我的', iconName: 'user' },
    ]

    // 家属端模式 (4 大核心入口，26px 矢量图标，16px 适老底线文字)
    const familyList: TabItem[] = [
      { pagePath: '/pages/dashboard/index', text: '看板', iconName: 'grid' },
      { pagePath: '/pages/care/index', text: '照护干预', iconName: 'medication' },
      { pagePath: '/pages/family-manage/index', text: '设备管理', iconName: 'settings' },
      { pagePath: '/pages/profile/index', text: '我的', iconName: 'user' },
    ]

    const currentList = role === 'elder' ? elderList : familyList
    const isElder = role === 'elder'

    // 配色方案：激活态翡翠松青 #1F6B56，未激活沉香黛灰 #6F7E77
    const activeColor = '#1F6B56'
    const inactiveColor = '#6F7E77'

    return (
      <View className="custom-tab-bar-container">
        <View className={`custom-tab-bar ${isElder ? 'elder-mode' : 'family-mode'}`}>
          <View className="tab-bar-wrap">
            {currentList.map((item, index) => {
              const isActive = selected === index
              const iconSize = isElder ? 30 : 24
              const currentColor = isActive ? activeColor : inactiveColor

              return (
                <View
                  key={item.pagePath}
                  className={`tab-bar-item ${isActive ? 'active' : ''}`}
                  onClick={() => this.switchTab(index, item.pagePath)}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={item.text}
                >
                  <View className="tab-bar-item-inner">
                    <Icon
                      name={item.iconName}
                      size={iconSize}
                      color={currentColor}
                      className="tab-bar-vector-icon"
                    />
                    <Text className="tab-bar-text" style={{ color: currentColor }}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      </View>
    )
  }
}
