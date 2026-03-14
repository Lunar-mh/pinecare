import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Heart } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { getUserPageConfig } from '@/services'
import './index.scss'

type AboutConfig = {
  appName: string
  appVersion: string
  effectiveDate: string
  summary: string
  documents: Array<{
    key: string
    title: string
    version: string
    effectiveDate: string
    summary: string
  }>
  changelog: string[]
}

const EMPTY_ABOUT: AboutConfig = {
  appName: '银伴全域智慧照护平台',
  appVersion: '1.0.0',
  effectiveDate: '',
  summary: '文档信息加载中。',
  documents: [],
  changelog: [],
}

export default function AboutPage() {
  const [about, setAbout] = useState<AboutConfig>(EMPTY_ABOUT)
  const [loading, setLoading] = useState(true)

  const loadAbout = async (showToast = false) => {
    setLoading(true)
    try {
      const config = await getUserPageConfig()
      setAbout(config.about || EMPTY_ABOUT)
      if (showToast) {
        Taro.showToast({ title: '文档已刷新', icon: 'none' })
      }
    } catch (_error) {
      Taro.showToast({ title: '文档加载失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAbout(false)
  }, [])

  return (
    <PageShell roleTone="family" className="settings-detail-page" loading={loading}>
      <HeroHeader roleTone="family" eyebrow="关于应用" title="版本、协议与更新信息" subtitle="内容由后端文档接口提供，前端不再写死演示文案。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="版本信息" description="当前版本和文档生效日期来自后端。">
          <View className="detail-stack">
            <DataPanel tone="primary">
              <Text className="detail-title">{about.appName}</Text>
              <Text className="detail-text">Version {about.appVersion}</Text>
              <Text className="detail-meta">生效日期 {about.effectiveDate || '待更新'}</Text>
              <Text className="detail-meta">{about.summary}</Text>
            </DataPanel>
          </View>
        </SectionBlock>

        <SectionBlock title="协议与说明" description="以下摘要来自后端维护的正式文档。">
          <View className="detail-stack">
            {about.documents.map((item) => (
              <DataPanel key={item.key} tone="info">
                <Text className="detail-title">{item.title}</Text>
                <Text className="detail-text">{item.summary}</Text>
                <Text className="detail-meta">{item.version} · 生效日期 {item.effectiveDate || '待更新'}</Text>
              </DataPanel>
            ))}
          </View>
        </SectionBlock>

        <SectionBlock title="最近更新" description="记录当前版本的联调与发布状态。">
          <View className="detail-stack">
            {about.changelog.map((item, index) => (
              <DataPanel key={`${item}-${index}`} tone={index === 0 ? 'warning' : 'info'}>
                <Text className="detail-title">更新 {index + 1}</Text>
                <Text className="detail-text">{item}</Text>
              </DataPanel>
            ))}
          </View>
        </SectionBlock>

        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="刷新文档" icon={<Heart size={22} />} onClick={() => loadAbout(true)} />
    </PageShell>
  )
}
