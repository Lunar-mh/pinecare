import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Heart } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import './index.scss'

const DOCUMENTS = [
  {
    key: 'privacy',
    title: '隐私政策',
    version: 'v1.0.0',
    effectiveDate: '2026-03-12',
    summary: '说明健康、位置、紧急联系人、语音和家庭空间数据的采集目的、保存方式、删除路径和脱敏规则。',
  },
  {
    key: 'agreement',
    title: '用户协议',
    version: 'v1.0.0',
    effectiveDate: '2026-03-12',
    summary: '明确长辈、家属、社区和志愿者使用平台时的账号责任、服务边界、异常处理和申诉方式。',
  },
  {
    key: 'medical',
    title: '医疗免责声明',
    version: 'v1.0.0',
    effectiveDate: '2026-03-12',
    summary: '说明医疗目录、预约、问诊和报告能力的适用边界，以及需要转人工和线下就医的情形。',
  },
  {
    key: 'ai',
    title: 'AI 使用说明',
    version: 'v1.0.0',
    effectiveDate: '2026-03-12',
    summary: '说明 AI 健康咨询、语音助理和陪伴功能的作用边界、风险分级和人工兜底提示。',
  },
]

const CHANGELOG = [
  '完成四端非 Live 收官，协议与说明文本进入固定版本。',
  '统一了后端证据接口、诊断能力和比赛演示基线数据口径。',
  '补齐医疗、定位、安全区、志愿者闭环等关键流程。',
]

export default function AboutPage() {
  return (
    <PageShell roleTone="family" className="settings-detail-page">
      <HeroHeader roleTone="family" eyebrow="关于应用" title="版本、协议和更新信息直接放在应用内" subtitle="把版本信息、协议摘要和更新记录收成同一页，随时能回看。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="版本信息" description="当前版本、平台定位和最近一次生效日期。">
          <View className="detail-stack">
            <DataPanel tone="primary">
              <Text className="detail-title">银伴智慧照护平台</Text>
              <Text className="detail-text">Version 1.0.0</Text>
              <Text className="detail-meta">生效日期 2026-03-12 · 面向长辈、家属、社区与志愿者的全域照护体验。</Text>
            </DataPanel>
          </View>
        </SectionBlock>
        <SectionBlock title="协议与说明" description="保留当前最常用的正式文本摘要和版本信息。">
          <View className="detail-stack">
            {DOCUMENTS.map(item => (
              <DataPanel key={item.key} tone="info">
                <Text className="detail-title">{item.title}</Text>
                <Text className="detail-text">{item.summary}</Text>
                <Text className="detail-meta">{item.version} · 生效日期 {item.effectiveDate}</Text>
              </DataPanel>
            ))}
          </View>
        </SectionBlock>
        <SectionBlock title="最近更新" description="保留可复述的版本更新记录，便于答辩和日常回看。">
          <View className="detail-stack">
            {CHANGELOG.map((item, index) => (
              <DataPanel key={item} tone={index === 0 ? 'warning' : 'info'}>
                <Text className="detail-title">更新 {index + 1}</Text>
                <Text className="detail-text">{item}</Text>
              </DataPanel>
            ))}
          </View>
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="检查更新" icon={<Heart size={22} />} onClick={() => Taro.showToast({ title: '当前已经是最新版本', icon: 'none' })} />
    </PageShell>
  )
}
