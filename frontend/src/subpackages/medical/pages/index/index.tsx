import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Clock, Service, Star } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { getMedicalReports, getMyAppointments, searchDoctors } from '@/services/modules/medical'
import type { Appointment, Doctor, MedicalReport } from '@/services/types'
import './index.scss'

export default function MedicalIndex() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [doctorRes, appointmentRes, reportRes] = await Promise.all([
        searchDoctors({ page: 1, pageSize: 4, isOnline: true }),
        getMyAppointments({ page: 1, pageSize: 3 }),
        getMedicalReports({ page: 1, pageSize: 3 }),
      ])
      setDoctors(doctorRes?.list || [])
      setAppointments(appointmentRes?.list || [])
      setReports(reportRes?.list || [])
    } catch (error) {
      console.error('load medical page failed', error)
      setDoctors([])
      setAppointments([])
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  usePullDownRefresh(() => { loadData().finally(() => Taro.stopPullDownRefresh()) })

  return (
    <PageShell roleTone="family" className="medical-overview-page">
      <HeroHeader roleTone="family" eyebrow="医疗连接" title="医生、预约、报告放到一个医疗入口" subtitle="不再把线上医生、预约状态和报告入口拆散，家属也能更快代看。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="快捷入口" description="把高频动作前置，避免来回找。">
          <ActionGrid columns={2} onSelect={() => Taro.showToast({ title: '下一阶段继续接入下钻流程', icon: 'none' })} items={[
            { key: 'online', label: '线上问诊', description: '优先咨询在线医生', icon: <Service size={24} /> },
            { key: 'offline', label: '线下预约', description: '安排门诊或复诊时间', icon: <Clock size={24} /> },
            { key: 'report', label: '检查报告', description: '查看最近上传的报告', icon: <Star size={24} /> },
            { key: 'history', label: '就诊记录', description: '回看既往预约和报告', icon: <Service size={24} /> },
          ]} />
        </SectionBlock>

        <SectionBlock title="最近预约" description="优先确认近期是否已经有待处理预约。">
          {appointments.length === 0 ? <EmptyState title="暂时没有预约" description="可以从快捷入口开始新的线上或线下预约。" icon={<Clock size={28} />} /> : <View className="detail-stack">{appointments.map(item => <DataPanel key={item.id} tone={item.status === 'confirmed' ? 'success' : item.status === 'pending' ? 'warning' : 'info'}><Text className="detail-title">{item.doctorName}</Text><Text className="detail-text">{item.hospital} · {item.department}</Text><Text className="detail-meta">{new Date(item.scheduledAt).toLocaleString('zh-CN')} · {item.type === 'online' ? '线上' : '线下'} · {item.status}</Text></DataPanel>)}</View>}
        </SectionBlock>

        <SectionBlock title="在线医生" description="先展示可联系的医生，不做过重的搜索页。">
          {loading ? <DataPanel tone="info"><Text className="detail-text">正在同步医生列表...</Text></DataPanel> : doctors.length === 0 ? <EmptyState title="当前没有在线医生" description="可以稍后再试，或先查看已有预约。" icon={<Service size={28} />} /> : <View className="detail-stack">{doctors.map(item => <DataPanel key={item.id} tone={item.isOnline ? 'success' : 'info'}><Text className="detail-title">{item.name} · {item.title}</Text><Text className="detail-text">{item.hospital} · {item.department}</Text><Text className="detail-meta">评分 {item.rating} · 费用 {item.consultationFee} 元</Text></DataPanel>)}</View>}
        </SectionBlock>

        <SectionBlock title="最近报告" description="让家属和长辈都能从同一处回看最近检查。">
          {reports.length === 0 ? <EmptyState title="暂无报告" description="后续上传的检查报告会出现在这里。" icon={<Star size={28} />} /> : <View className="detail-stack">{reports.map(item => <DataPanel key={item.id} tone="info"><Text className="detail-title">{item.title}</Text><Text className="detail-text">{item.hospital}</Text><Text className="detail-meta">{new Date(item.reportDate).toLocaleDateString('zh-CN')} · {item.type}</Text></DataPanel>)}</View>}
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="发起一次医疗咨询" icon={<Service size={22} />} onClick={() => Taro.showToast({ title: '下一阶段补齐预约与咨询深链', icon: 'none' })} />
    </PageShell>
  )
}

