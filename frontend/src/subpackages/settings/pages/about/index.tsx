import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Heart } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import './index.scss'

export default function AboutPage() {
  return (
    <PageShell roleTone="family" className="settings-detail-page">
      <HeroHeader roleTone="family" eyebrow="关于应用" title="版本、协议和更新入口保持清楚" subtitle="把原本分散的说明页收成几张卡片，便于回看。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="版本信息" description="当前版本、定位和更新动作。">
          <View className="detail-stack"><DataPanel tone="primary"><Text className="detail-title">银伴智慧照护平台</Text><Text className="detail-text">Version 1.0.0</Text><Text className="detail-meta">面向长辈、家属、社区与运营的全域照护体验。</Text></DataPanel></View>
        </SectionBlock>
        <SectionBlock title="说明与协议" description="先给出最常用的说明项。">
          <View className="detail-stack"><DataPanel tone="info"><Text className="detail-title">隐私与服务说明</Text><Text className="detail-text">当前页面保留查看入口，后续可继续接入完整协议正文和版本更新记录。</Text></DataPanel></View>
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="检查更新" icon={<Heart size={22} />} onClick={() => Taro.showToast({ title: '当前已经是最新版本', icon: 'none' })} />
    </PageShell>
  )
}
