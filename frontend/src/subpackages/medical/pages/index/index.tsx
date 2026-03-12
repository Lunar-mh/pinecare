import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Clock, Message, Service, Star } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { createAppointment, getMedicalConsultations, getMedicalReports, getMyAppointments, searchDoctors, startMedicalConsultation } from '@/services/modules/medical'
import type { Appointment, Doctor, MedicalReport } from '@/services/types'
import type { MedicalConsultation } from '@/services/modules/medical'
import './index.scss'

function nextAppointmentSlot() {
  const value = new Date()
  value.setDate(value.getDate() + 1)
  value.setHours(9, 0, 0, 0)
  return value.toISOString()
}

export default function MedicalIndex() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [consultations, setConsultations] = useState<MedicalConsultation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const leadDoctor = useMemo(() => doctors.find(item => item.isOnline) || doctors[0] || null, [doctors])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [doctorRes, appointmentRes, reportRes, consultRes] = await Promise.all([
        searchDoctors({ page: 1, pageSize: 4, isOnline: true }),
        getMyAppointments({ page: 1, pageSize: 3 }),
        getMedicalReports({ page: 1, pageSize: 3 }),
        getMedicalConsultations(3),
      ])
      setDoctors(doctorRes?.list || [])
      setAppointments(appointmentRes?.list || [])
      setReports(reportRes?.list || [])
      setConsultations(consultRes?.list || [])
    } catch (error) {
      console.error('load medical page failed', error)
      setDoctors([])
      setAppointments([])
      setReports([])
      setConsultations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  usePullDownRefresh(() => { loadData().finally(() => Taro.stopPullDownRefresh()) })

  const handleQuickAction = useCallback(async (key: string) => {
    if (actionLoading) return

    if (key === 'report') {
      const latestReport = reports[0]
      if (!latestReport) {
        Taro.showToast({ title: '当前还没有可查看的报告', icon: 'none' })
        return
      }
      await Taro.showModal({
        title: latestReport.title,
        content: `${latestReport.hospital}\n${new Date(latestReport.reportDate).toLocaleDateString('zh-CN')} · ${latestReport.type}`,
        showCancel: false,
      })
      return
    }

    if (key === 'history') {
      await Taro.showModal({
        title: '最近医疗记录',
        content: `预约 ${appointments.length} 条，咨询 ${consultations.length} 条，报告 ${reports.length} 条。`,
        showCancel: false,
      })
      return
    }

    if (!leadDoctor) {
      Taro.showToast({ title: '当前没有可用医生，请稍后重试', icon: 'none' })
      return
    }

    setActionLoading(key)
    try {
      if (key === 'online') {
        const result = await startMedicalConsultation({ doctorId: String(leadDoctor.id), department: leadDoctor.department })
        await Taro.showModal({
          title: '已发起在线咨询',
          content: `${leadDoctor.name} · ${leadDoctor.department}\n模式：${result.effectiveMode || 'unknown'}${result.lastSuccessAt ? `\n最近成功：${result.lastSuccessAt}` : ''}`,
          showCancel: false,
        })
      }

      if (key === 'offline') {
        await createAppointment({
          doctorId: String(leadDoctor.id),
          scheduledAt: nextAppointmentSlot(),
          type: 'offline',
          complaint: '需要线下复诊与健康复查',
        })
        Taro.showToast({ title: '已创建一条预约记录', icon: 'success' })
      }

      await loadData()
    } catch (error) {
      console.error('medical quick action failed', error)
      Taro.showToast({ title: error instanceof Error ? error.message : '操作失败，请稍后再试', icon: 'none' })
    } finally {
      setActionLoading(null)
    }
  }, [actionLoading, appointments.length, consultations.length, leadDoctor, loadData, reports])

  return (
    <PageShell roleTone="family" className="medical-overview-page">
      <HeroHeader roleTone="family" eyebrow="医疗连接" title="医生、预约、咨询、报告放到同一个医疗入口" subtitle="不用再把线上医生、预约状态和报告入口拆散，家属也能更快代看。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="快捷入口" description="把高频动作前置，避免来回找。">
          <ActionGrid
            columns={2}
            onSelect={handleQuickAction}
            items={[
              { key: 'online', label: actionLoading === 'online' ? '咨询处理中' : '在线问诊', description: '优先咨询当前在线医生', icon: <Service size={24} /> },
              { key: 'offline', label: actionLoading === 'offline' ? '预约处理中' : '线下预约', description: '直接创建一条门诊预约', icon: <Clock size={24} /> },
              { key: 'report', label: '查看报告', description: '直接查看最近一条报告摘要', icon: <Star size={24} /> },
              { key: 'history', label: '就诊记录', description: '汇总预约、咨询与报告数量', icon: <Message size={24} /> },
            ]}
          />
        </SectionBlock>

        <SectionBlock title="最近预约" description="优先确认近期是否已经有待处理预约。">
          {appointments.length === 0 ? <EmptyState title="暂时没有预约" description="可以直接从上面的快捷入口创建新的线上或线下预约。" icon={<Clock size={28} />} /> : <View className="detail-stack">{appointments.map(item => <DataPanel key={item.id} tone={item.status === 'confirmed' ? 'success' : item.status === 'pending' ? 'warning' : 'info'}><Text className="detail-title">{item.doctorName}</Text><Text className="detail-text">{item.hospital} · {item.department}</Text><Text className="detail-meta">{new Date(item.scheduledAt).toLocaleString('zh-CN')} · {item.type === 'online' ? '线上' : '线下'} · {item.status}</Text></DataPanel>)}</View>}
        </SectionBlock>

        <SectionBlock title="在线医生" description="先展示可联系的医生，不做过重的搜索页。">
          {loading ? <DataPanel tone="info"><Text className="detail-text">正在同步医生列表...</Text></DataPanel> : doctors.length === 0 ? <EmptyState title="当前没有在线医生" description="可以稍后再试，或先查看已经存在的预约与报告。" icon={<Service size={28} />} /> : <View className="detail-stack">{doctors.map(item => <DataPanel key={item.id} tone={item.isOnline ? 'success' : 'info'}><Text className="detail-title">{item.name} · {item.title}</Text><Text className="detail-text">{item.hospital} · {item.department}</Text><Text className="detail-meta">评分 {item.rating} · 费用 {item.consultationFee} 元</Text></DataPanel>)}</View>}
        </SectionBlock>

        <SectionBlock title="最近咨询" description="把线上咨询和本地记录放在同一处回看。">
          {consultations.length === 0 ? <EmptyState title="暂时没有咨询记录" description="点击顶部的在线问诊可以直接发起一次咨询。" icon={<Message size={28} />} /> : <View className="detail-stack">{consultations.map(item => <DataPanel key={item.id} tone={item.consultStatus === 'active' ? 'success' : item.consultStatus === 'pending' ? 'warning' : 'info'}><Text className="detail-title">医生 ID {item.doctorId}</Text><Text className="detail-text">{item.department}</Text><Text className="detail-meta">{item.consultStatus} · 开始于 {item.startedAt ? new Date(item.startedAt).toLocaleString('zh-CN') : '未记录'}</Text></DataPanel>)}</View>}
        </SectionBlock>

        <SectionBlock title="最近报告" description="让家属和长辈都能从同一处回看最近检查。">
          {reports.length === 0 ? <EmptyState title="暂无报告" description="后续上传的检查报告会出现在这里。" icon={<Star size={28} />} /> : <View className="detail-stack">{reports.map(item => <DataPanel key={item.id} tone="info"><Text className="detail-title">{item.title}</Text><Text className="detail-text">{item.hospital}</Text><Text className="detail-meta">{new Date(item.reportDate).toLocaleDateString('zh-CN')} · {item.type}</Text></DataPanel>)}</View>}
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label={actionLoading === 'online' ? '咨询处理中...' : '发起一次医疗咨询'} icon={<Service size={22} />} onClick={() => handleQuickAction('online')} />
    </PageShell>
  )
}
