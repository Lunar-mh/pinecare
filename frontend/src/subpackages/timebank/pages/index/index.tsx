import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { HeroHeader, PageShell, SectionBlock, EmptyState, StickyPrimaryAction } from '@/components/shell'
import { Clock } from '@nutui/icons-react-taro'
import './index.scss'

export default function TimeBankIndex() {
  return (
    <PageShell roleTone="family" className="timebank-moved-page">
      <HeroHeader
        roleTone="family"
        eyebrow="功能迁移说明"
        title="时间银行已迁移到志愿者端和社区管理端"
        subtitle="家属端不再承载服务供给、接单和时长币运营，避免和守护任务混在一起。"
      />

      <SectionBlock title="为什么调整" description="让每个端只保留最适合自己的任务，减少认知负担。">
        <EmptyState
          title="该功能已迁移"
          description="志愿者端负责接单、签到、工时和任务执行；社区管理端负责审核、调度和排行榜。家属端只保留老人守护、家庭互动和服务协调。"
          icon={<Clock size={28} />}
          actionLabel="返回守护服务"
          onAction={() => Taro.switchTab({ url: '/pages/services/index' })}
        />
      </SectionBlock>

      <StickyPrimaryAction
        tone="family"
        label="返回守护服务"
        icon={<Clock size={20} />}
        onClick={() => Taro.switchTab({ url: '/pages/services/index' })}
      />
    </PageShell>
  )
}