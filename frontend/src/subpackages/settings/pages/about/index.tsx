import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function About() {
  const handleCheckUpdate = () => {
    if (Taro.canIUse('getUpdateManager')) {
      const updateManager = Taro.getUpdateManager()
      
      Taro.showLoading({ title: '检查更新中...' })
      
      updateManager.onCheckForUpdate((res) => {
        Taro.hideLoading()
        if (res.hasUpdate) {
          Taro.showModal({
            title: '更新提示',
            content: '新版本已经准备好，是否重启应用？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                updateManager.applyUpdate()
              }
            }
          })
        } else {
          Taro.showToast({
            title: '当前已是最新版本',
            icon: 'none'
          })
        }
      })
      
      updateManager.onUpdateFailed(() => {
        Taro.hideLoading()
        Taro.showModal({
          title: '更新失败',
          content: '新版本下载失败，请检查网络后重试',
          showCancel: false
        })
      })
    } else {
      Taro.showToast({
        title: '当前微信版本过低，无法使用该功能',
        icon: 'none'
      })
    }
  }

  const handleShowPolicy = (type: string) => {
    Taro.showToast({
      title: `正在打开${type}...`,
      icon: 'none'
    })
  }

  return (
    <View className="about-page">
      <ScrollView scrollY className="about-scroll">
        <View className="header-section">
          <View className="logo-container">
            <Text className="logo-text">银伴</Text>
          </View>
          <Text className="app-name">银伴全域智慧照护平台</Text>
          <Text className="app-version">Version 1.0.0</Text>
        </View>

        <View className="intro-section">
          <Text className="intro-paragraph">
            银伴是一款专为老年人设计的全域智慧照护平台，致力于通过科技手段提升长辈的生活质量，让关爱跨越距离。
          </Text>
          <Text className="intro-paragraph">
            我们提供健康档案管理、用药提醒、紧急SOS告警、AI健康咨询等全方位服务，同时支持家属端实时查看长辈健康状况，让家人更安心。
          </Text>
          <Text className="intro-paragraph">
            银伴，让科技更有温度，让陪伴无处不在。
          </Text>
        </View>

        <View className="action-section">
          <View className="action-item" onClick={handleCheckUpdate}>
            <Text className="action-text">检查更新</Text>
            <Text className="arrow arrow-right"></Text>
          </View>
          <View className="action-item" onClick={() => handleShowPolicy('服务条款')}>
            <Text className="action-text">服务条款</Text>
            <Text className="arrow arrow-right"></Text>
          </View>
          <View className="action-item" onClick={() => handleShowPolicy('隐私政策')}>
            <Text className="action-text">隐私政策</Text>
            <Text className="arrow arrow-right"></Text>
          </View>
        </View>

        <View className="footer-section">
          <Text className="copyright">Copyright © 2026 银伴科技</Text>
          <Text className="copyright">All Rights Reserved</Text>
        </View>
      </ScrollView>
    </View>
  )
}
