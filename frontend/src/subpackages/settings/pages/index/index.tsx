import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Heart, Notice, Setting, Service } from '@nutui/icons-react-taro'
import { HeroHeader, PageShell, SectionBlock, ActionGrid } from '@/components/shell'
import './index.scss'

const items = [
  { key: 'device', label: '设备与定位', description: '绑定设备、检查在线状态', icon: <Setting size={24} /> },
  { key: 'emergency', label: '紧急联系人', description: '维护 SOS 联系方式', icon: <Notice size={24} /> },
  { key: 'feedback', label: '帮助反馈', description: '问题反馈与常见帮助', icon: <Service size={24} /> },
  { key: 'about', label: '关于应用', description: '版本、协议与更新说明', icon: <Heart size={24} /> },
]

const routeMap: Record<string, string> = {
  device: '/subpackages/settings/pages/device/index',
  emergency: '/subpackages/settings/pages/emergency/index',
  feedback: '/subpackages/settings/pages/feedback/index',
  about: '/subpackages/settings/pages/about/index',
}

export default function SettingsPage() {
  return (
    <PageShell roleTone="family" className="settings-hub-page">
      <HeroHeader roleTone="family" eyebrow="设置中心" title="把分散设置收成四个清楚入口" subtitle="设备、紧急联系人、帮助反馈、关于应用统一从这里进入。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="设置分组" description="保留最少的入口词，减少找功能的时间。">
          <ActionGrid items={items} columns={2} onSelect={key => Taro.navigateTo({ url: routeMap[key] })} />
        </SectionBlock>
      </ScrollView>
    </PageShell>
  )
}

