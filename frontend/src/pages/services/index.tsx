import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ActionGrid, HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { Icon, type IconName } from '@/components/icons'
import { getUserPageConfig, type PageConfigCluster } from '@/services'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function ServicesPage() {
  const { role } = useRole()
  const [clusters, setClusters] = useState<PageConfigCluster[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadConfig = async () => {
      setLoading(true)
      try {
        const config = await getUserPageConfig()
        if (!mounted) return
        setClusters(config.servicesByRole[role] || [])
      } catch (_error) {
        if (mounted) {
          setClusters([])
          Taro.showToast({ title: '服务配置加载失败，请稍后重试', icon: 'none' })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadConfig()
    return () => {
      mounted = false
    }
  }, [role])

  const navigateByPath = (path: string) => {
    if (path.startsWith('/pages/')) {
      Taro.switchTab({ url: path })
      return
    }
    Taro.navigateTo({ url: path }).catch(() => {
      Taro.showToast({ title: '页面暂时无法打开', icon: 'none' })
    })
  }

  const isElder = role === 'elder'

  const headerText = useMemo(
    () => ({
      eyebrow: isElder ? '服务分组来自后端配置' : '守护动作由后端统一编排',
      title: isElder ? '常用照护服务' : '家属守护服务',
      subtitle: '页面入口、分组和文案都由后端接口返回，前端仅负责展示。',
    }),
    [isElder]
  )

  return (
    <PageShell roleTone={isElder ? 'elder' : 'family'} className="services-dashboard" loading={loading}>
      <HeroHeader
        roleTone={isElder ? 'elder' : 'family'}
        eyebrow={headerText.eyebrow}
        title={headerText.title}
        subtitle={headerText.subtitle}
      />

      {clusters.length === 0 && !loading ? (
        <View className="empty-state">
          <Text>当前没有可用服务分组，请联系管理员检查后端配置。</Text>
        </View>
      ) : null}

      {clusters.map((cluster) => (
        <SectionBlock key={cluster.key} title={cluster.title} description={cluster.description}>
          <ActionGrid
            items={cluster.items.map((item) => ({
              key: item.key,
              label: item.label,
              description: item.description,
              badge: item.badge,
              icon: <Icon name={item.icon as IconName} size={28} color={isElder ? '#2f6c5b' : '#c97b55'} />,
            }))}
            onSelect={(key) => {
              const target = cluster.items.find((item) => item.key === key)
              if (target) navigateByPath(target.path)
            }}
          />
        </SectionBlock>
      ))}
    </PageShell>
  )
}
