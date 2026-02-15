import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import { Plus, Close, Tips, Clock } from '@nutui/icons-react-taro';
import { LargeInput, LargeButton, SectionTitle, AlertBanner } from '@/components/elderly';
import { addMedication } from '@/services/modules/medication';
import type { MedicationSchedule } from '@/services/types';
import './index.scss';

const FREQUENCY_OPTIONS = [
  { label: '每日1次', value: '每日1次', times: 1 },
  { label: '每日2次', value: '每日2次', times: 2 },
  { label: '每日3次', value: '每日3次', times: 3 },
  { label: '每日4次', value: '每日4次', times: 4 },
  { label: '隔日1次', value: '隔日1次', times: 1 },
  { label: '每周1次', value: '每周1次', times: 1 },
];

const REMINDER_OPTIONS = [
  { label: '准时提醒', value: 0 },
  { label: '提前5分钟', value: 5 },
  { label: '提前10分钟', value: 10 },
  { label: '提前15分钟', value: 15 },
  { label: '提前30分钟', value: 30 },
];

const DEFAULT_TIMES = ['08:00', '12:00', '18:00', '22:00'];

export default function MedicationAddPage() {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('每日1次');
  const [schedule, setSchedule] = useState<MedicationSchedule[]>([{ time: '08:00', dosage: '1片' }]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [reminderTime, setReminderTime] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleFrequencyChange = (freq: string) => {
    const opt = FREQUENCY_OPTIONS.find(o => o.value === freq);
    if (!opt) return;
    setFrequency(freq);
    // Rebuild schedule to match frequency
    const newSchedule: MedicationSchedule[] = [];
    for (let i = 0; i < opt.times; i++) {
      newSchedule.push({
        time: DEFAULT_TIMES[i] || '08:00',
        dosage: dosage || '1片',
      });
    }
    setSchedule(newSchedule);
  };

  const handleScheduleTimeChange = (index: number, time: string) => {
    setSchedule(prev => prev.map((s, i) => i === index ? { ...s, time } : s));
  };

  const handleScheduleDosageChange = (index: number, d: string) => {
    setSchedule(prev => prev.map((s, i) => i === index ? { ...s, dosage: d } : s));
  };

  const handleAddSchedule = () => {
    if (schedule.length >= 6) return;
    setSchedule(prev => [...prev, { time: DEFAULT_TIMES[prev.length] || '08:00', dosage: dosage || '1片' }]);
  };

  const handleRemoveSchedule = (index: number) => {
    if (schedule.length <= 1) return;
    setSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入药品名称', icon: 'none' });
      return false;
    }
    if (!dosage.trim()) {
      Taro.showToast({ title: '请输入单次剂量', icon: 'none' });
      return false;
    }
    if (schedule.some(s => !s.time || !s.dosage)) {
      Taro.showToast({ title: '请完整填写用药时间和剂量', icon: 'none' });
      return false;
    }
    if (!startDate) {
      Taro.showToast({ title: '请选择开始日期', icon: 'none' });
      return false;
    }
    if (hasEndDate && endDate && endDate <= startDate) {
      Taro.showToast({ title: '结束日期必须晚于开始日期', icon: 'none' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await addMedication({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        schedule,
        startDate,
        endDate: hasEndDate && endDate ? endDate : undefined,
        instructions: instructions.trim() || undefined,
        reminderTime,
        isActive: true,
      });
      Taro.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1200);
    } catch (_) {
      // showToast triggered by request interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="add-medication">
      <ScrollView className="add-medication__scroll" scrollY>
        {/* 提示 */}
        <View className="add-medication__tip">
          <Tips size={18} color="#01579b" />
          <Text className="add-medication__tip-text">请遵医嘱填写用药信息，切勿随意更改剂量</Text>
        </View>

        {/* 基本信息 */}
        <SectionTitle title="基本信息" />
        <View className="add-medication__card">
          <LargeInput
            label="药品名称 *"
            value={name}
            onChange={setName}
            placeholder="如：阿司匹林、降压药"
            maxLength={30}
          />
          <LargeInput
            label="单次剂量 *"
            value={dosage}
            onChange={setDosage}
            placeholder="如：1片、2粒、5ml"
            maxLength={20}
          />
          <LargeInput
            label="服用说明（选填）"
            value={instructions}
            onChange={setInstructions}
            placeholder="如：饭后服用、避免空腹"
            maxLength={50}
          />
        </View>

        {/* 用药频率 */}
        <SectionTitle title="用药频率" />
        <View className="add-medication__card">
          <View className="frequency-grid">
            {FREQUENCY_OPTIONS.map(opt => (
              <View
                key={opt.value}
                className={`frequency-item ${frequency === opt.value ? 'frequency-item--active' : ''}`}
                onClick={() => handleFrequencyChange(opt.value)}
              >
                <Text className="frequency-item__text">{opt.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 用药时间安排 */}
        <SectionTitle title="每日时间安排" />
        <View className="add-medication__card">
          {schedule.map((s, index) => (
            <View key={index} className="schedule-row">
              <View className="schedule-row__left">
                <Clock size={18} color="#01579b" />
                <Text className="schedule-row__label">第{index + 1}次</Text>
              </View>
              <View className="schedule-row__inputs">
                <LargeInput
                  label="时间"
                  value={s.time}
                  onChange={val => handleScheduleTimeChange(index, val)}
                  placeholder="08:00"
                  maxLength={5}
                />
                <LargeInput
                  label="剂量"
                  value={s.dosage}
                  onChange={val => handleScheduleDosageChange(index, val)}
                  placeholder="1片"
                  maxLength={10}
                />
              </View>
              {schedule.length > 1 && (
                <View
                  className="schedule-row__remove"
                  onClick={() => handleRemoveSchedule(index)}
                >
                  <Close size={20} color="#e53935" />
                </View>
              )}
            </View>
          ))}
          {schedule.length < 6 && (
            <View className="schedule-add" onClick={handleAddSchedule}>
              <Plus size={16} color="#01579b" />
              <Text className="schedule-add__text">添加时间</Text>
            </View>
          )}
        </View>

        {/* 日期设置 */}
        <SectionTitle title="用药周期" />
        <View className="add-medication__card">
          <LargeInput
            label="开始日期 *"
            value={startDate}
            onChange={setStartDate}
            placeholder="2024-01-01"
            maxLength={10}
          />
          <View className="toggle-row">
            <Text className="toggle-row__label">设置结束日期</Text>
            <Switch
              checked={hasEndDate}
              onChange={() => setHasEndDate(prev => !prev)}
              color="#01579b"
            />
          </View>
          {hasEndDate && (
            <LargeInput
              label="结束日期"
              value={endDate}
              onChange={setEndDate}
              placeholder="2024-12-31"
              maxLength={10}
            />
          )}
        </View>

        {/* 提醒设置 */}
        <SectionTitle title="提醒设置" />
        <View className="add-medication__card">
          <View className="reminder-grid">
            {REMINDER_OPTIONS.map(opt => (
              <View
                key={opt.value}
                className={`reminder-item ${reminderTime === opt.value ? 'reminder-item--active' : ''}`}
                onClick={() => setReminderTime(opt.value)}
              >
                <Text className="reminder-item__text">{opt.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <AlertBanner
          type="info"
          title="温馨提示"
          message="用药计划保存后将自动生成每日提醒，请确保已开启微信通知权限"
        />

        <View className="add-medication__submit">
          <LargeButton
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleSubmit}
          >
            保存用药计划
          </LargeButton>
        </View>

        <View className="add-medication__safe-area" />
      </ScrollView>
    </View>
  );
}
