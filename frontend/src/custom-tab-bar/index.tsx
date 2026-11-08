import { View, Image, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Component } from 'react'
import './index.scss'

import homeIcon from '../assets/tabbar/home.png'
import homeActiveIcon from '../assets/tabbar/home-active.png'
import servicesIcon from '../assets/tabbar/services.png'
import servicesActiveIcon from '../assets/tabbar/services-active.png'
import profileIcon from '../assets/tabbar/profile.png'
import profileActiveIcon from '../assets/tabbar/profile-active.png'

export default class CustomTabBar extends Component {
  state = {
    selected: 0,
    role: 'elder'
  }

  componentDidMount() {
    this.updateRole()
  }

  updateRole = () => {
    const r = Taro.getStorageSync('userRole') || 'elder'
    if (this.state.role !== r) {
      this.setState({ role: r })
    }
  }

  setSelected(idx: number) {
    this.setState({ selected: idx })
  }

  switchTab = (index: number, url: string) => {
    this.updateRole()
    this.setSelected(index)
    Taro.switchTab({ url })
  }

  render() {
    const { selected, role } = this.state

    const elderList = [
      { pagePath: '/pages/index/index', text: '首页', icon: homeIcon, activeIcon: homeActiveIcon },
      { pagePath: '/pages/services/index', text: '健康陪伴', icon: servicesIcon, activeIcon: servicesActiveIcon },
      { pagePath: '/pages/profile/index', text: '我的', icon: profileIcon, activeIcon: profileActiveIcon }
    ]

    const familyList = [
      { pagePath: '/pages/dashboard/index', text: '看板', icon: homeIcon, activeIcon: homeActiveIcon },
      { pagePath: '/pages/care/index', text: '照护干预', icon: servicesIcon, activeIcon: servicesActiveIcon },
      { pagePath: '/pages/family-manage/index', text: '设备管理', icon: servicesIcon, activeIcon: servicesActiveIcon },
      { pagePath: '/pages/profile/index', text: '我的', icon: profileIcon, activeIcon: profileActiveIcon }
    ]

    const currentList = role === 'elder' ? elderList : familyList

    return (
      <View className={`custom-tab-bar ${role === 'elder' ? 'elder-mode' : 'family-mode'}`}>
        <View className="tab-bar-wrap">
          {currentList.map((item, index) => {
            const isActive = selected === index
            return (
              <View
                key={item.pagePath}
                className={`tab-bar-item ${isActive ? 'active' : ''}`}
                onClick={() => this.switchTab(index, item.pagePath)}
              >
                <Image className="tab-bar-icon" src={isActive ? item.activeIcon : item.icon} />
                <Text className="tab-bar-text" style={{ color: isActive ? '#007AFF' : '#999999' }}>{item.text}</Text>
              </View>
            )
          })}
        </View>
        <View className="safe-area-bottom"></View>
      </View>
    )
  }
}
