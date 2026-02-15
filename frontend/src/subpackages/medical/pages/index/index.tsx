import { useState, useEffect, useCallback } from 'react';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { Search, Star, Clock, Location, ArrowRight } from '@nutui/icons-react-taro';
import { SectionTitle, LargeButton } from '@/components/elderly';
import { searchDoctors, getMyAppointments } from '@/services/modules/medical';
import type { Doctor, Appointment } from '@/services/types';
import './index.scss';

export default function MedicalIndex() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, apptRes] = await Promise.all([
        searchDoctors({ page: 1, pageSize: 5, isOnline: true }),
        getMyAppointments({ status: 'pending', page: 1, pageSize: 2 })
      ]);
      setDoctors(docRes?.list || []);
      setAppointments(apptRes?.list || []);
    } catch (_) { /* noop */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  usePullDownRefresh(() => {
    loadData().then(() => Taro.stopPullDownRefresh());
  });

  const handleBook = (id: string) => {
    Taro.showToast({ title: '预约功能开发中', icon: 'none' });
  };

  return (
    <View className="medical-page">
      <ScrollView className="medical-scroll" scrollY>
        {/* 顶部搜索区 */}
        <View className="search-header">
          <View className="search-bar">
            <Search size={18} color="#999" />
            <Text className="search-placeholder">搜索医生、科室或医院</Text>
          </View>
        </View>

        {/* 快捷菜单 */}
        <View className="medical-menu">
          <View className="menu-item" onClick={() => Taro.showToast({ title: '开发中', icon: 'none' })}>
            <View className="menu-icon menu-icon--online">💻</View>
            <Text className="menu-text">在线问诊</Text>
          </View>
          <View className="menu-item" onClick={() => Taro.showToast({ title: '开发中', icon: 'none' })}>
            <View className="menu-icon menu-icon--offline">🏥</View>
            <Text className="menu-text">医院挂号</Text>
          </View>
          <View className="menu-item" onClick={() => Taro.showToast({ title: '开发中', icon: 'none' })}>
            <View className="menu-icon menu-icon--report">📄</View>
            <Text className="menu-text">查报告</Text>
          </View>
          <View className="menu-item" onClick={() => Taro.showToast({ title: '开发中', icon: 'none' })}>
            <View className="menu-icon menu-icon--history">💊</View>
            <Text className="menu-text">复诊配药</Text>
          </View>
        </View>

        {/* 我的预约 */}
        {appointments.length > 0 && (
          <View className="appointments-section">
            <SectionTitle title="我的预约" />
            <View className="appointment-list">
              {appointments.map(appt => (
                <View key={appt.id} className="appointment-card">
                  <View className="appointment-header">
                    <Text className="appointment-type">{appt.type === 'online' ? '视频问诊' : '门诊预约'}</Text>
                    <Text className="appointment-status">待就诊</Text>
                  </View>
                  <View className="appointment-body">
                    <Text className="doctor-name">{appt.doctorName}</Text>
                    <Text className="appt-detail">{appt.department} · {appt.hospital}</Text>
                    <View className="appt-time">
                      <Clock size={14} color="#01579b" />
                      <Text>{new Date(appt.scheduledAt).toLocaleString('zh-CN')}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 推荐医生 */}
        <View className="doctors-section">
          <SectionTitle title="推荐名医" action="全部 >" />
          <View className="doctor-list">
            {doctors.map(doc => (
              <View key={doc.id} className="doctor-card">
                <Image className="doctor-avatar" src={doc.avatar || ''} mode="aspectFill" />
                <View className="doctor-info">
                  <View className="doctor-name-row">
                    <Text className="doctor-name">{doc.name}</Text>
                    <Text className="doctor-title">{doc.title}</Text>
                  </View>
                  <Text className="doctor-hospital">{doc.hospital} · {doc.department}</Text>
                  <View className="doctor-tags">
                    {doc.tags.slice(0, 3).map((tag, i) => (
                      <Text key={i} className="doctor-tag">{tag}</Text>
                    ))}
                  </View>
                  <View className="doctor-stats">
                    <Star size={14} color="#ffb300" />
                    <Text className="rating">{doc.rating}</Text>
                    <Text className="consult-count">问诊量 1000+</Text>
                  </View>
                </View>
                <View className="doctor-action">
                  <View className="book-btn" onClick={() => handleBook(doc.id)}>
                    <Text>预约</Text>
                  </View>
                </View>
              </View>
            ))}
            {loading && <View className="loading-text"><Text>加载中...</Text></View>}
            {!loading && doctors.length === 0 && (
              <View className="empty-state">
                <Text>暂无在线医生</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
