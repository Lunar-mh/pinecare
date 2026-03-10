import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ActionGrid, HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { Icon } from '@/components/icons'
import { serviceClustersByRole } from '@/design/navigation'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function ServicesPage() {
  const { role } = useRole()
  const clusters = serviceClustersByRole[role]

  const navigateByPath = (path: string) => {
    if (path.startsWith('/pages/')) {
      Taro.switchTab({ url: path })
      return
    }
    Taro.navigateTo({ url: path }).catch(() => {
      Taro.showToast({ title: '页面暂时无法打开', icon: 'none' })
    })
  }

  return (
    <PageShell roleTone={role === 'elder' ? 'elder' : 'family'} className="services-dashboard">
      <HeroHeader
        roleTone={role === 'elder' ? 'elder' : 'family'}
        eyebrow={role === 'elder' ? '以任务导向替代功能堆叠' : '守护、互动、协调放在一个入口'}
        title={role === 'elder' ? '把常用照护服务整理成更清楚的分组' : '把家属守护动作整理成更顺手的路径'}
        subtitle="每个分组只讲一件事，先知道去哪，再进入细页。"
      />

      {clusters.map(cluster => (
        <SectionBlock key={cluster.key} title={cluster.title} description={cluster.description}>
          <ActionGrid
            items={cluster.items.map(item => ({
              key: item.key,
              label: item.label,
              description: item.description,
              badge: item.badge,
              icon: <Icon name={item.icon} size={28} color={role === 'elder' ? '#2f6c5b' : '#c97b55'} />,
            }))}
            onSelect={(key) => {
              const target = cluster.items.find(item => item.key === key)
              if (target) navigateByPath(target.path)
            }}
          />
        </SectionBlock>
      ))}
    </PageShell>
  )
}
