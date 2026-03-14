import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { HeroHeader, PageShell, SectionBlock, ActionGrid } from '@/components/shell'
import { Icon, type IconName } from '@/components/icons'
import { getUserPageConfig, type PageConfigNavAction } from '@/services'
import './index.scss'

export default function SettingsPage() {
  const [items, setItems] = useState<PageConfigNavAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadConfig = async () => {
      setLoading(true)
      try {
        const config = await getUserPageConfig()
        if (!mounted) return
        setItems(config.settingsItems || [])
      } catch (_error) {
        if (mounted) {
          setItems([])
          Taro.showToast({ title: '设置配置加载失败，请稍后重试', icon: 'none' })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadConfig()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <PageShell roleTone="family" className="settings-hub-page" loading={loading}>
      <HeroHeader roleTone="family" eyebrow="设置中心" title="设置入口" subtitle="设置项由后端统一下发，前端不再本地写死。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="设置分组" description="设备、联系人、反馈、关于等入口来自后端接口。">
          {items.length === 0 && !loading ? (
            <View className="empty-state">
              <Text>暂无可用设置项，请稍后重试。</Text>
            </View>
          ) : (
            <ActionGrid
              items={items.map((item) => ({
                key: item.key,
                label: item.label,
                description: item.badge ? `${item.description}（${item.badge}）` : item.description,
                icon: <Icon name={item.icon as IconName} size={24} />,
              }))}
              columns={2}
              onSelect={(key) => {
                const target = items.find((item) => item.key === key)
                if (target) {
                  Taro.navigateTo({ url: target.path })
                }
              }}
            />
          )}
        </SectionBlock>
      </ScrollView>
    </PageShell>
  )
}
