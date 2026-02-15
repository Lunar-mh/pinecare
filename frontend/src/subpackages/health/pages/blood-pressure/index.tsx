import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Tips } from '@nutui/icons-react-taro';
import { LargeInput, LargeButton, SectionTitle } from '@/components/elderly';
import { addBloodPressureRecord } from '@/services/modules/health';
import './index.scss';

export default function BloodPressurePage() {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // 验证输入
  const validateInput = () => {
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    
    if (!systolic || !diastolic) {
      Taro.showToast({ title: '请输入收缩压和舒张压', icon: 'none' });
      return false;
    }
    
    if (isNaN(sys) || sys < 60 || sys > 250) {
      Taro.showToast({ title: '收缩压范围: 60-250', icon: 'none' });
      return false;
    }
    
    if (isNaN(dia) || dia < 40 || dia > 150) {
      Taro.showToast({ title: '舒张压范围: 40-150', icon: 'none' });
      return false;
    }
    
    if (dia >= sys) {
      Taro.showToast({ title: '舒张压应小于收缩压', icon: 'none' });
      return false;
    }
    
    return true;
  };

  // 提交记录
  const handleSubmit = async () => {
    if (!validateInput()) return;
    
    setLoading(true);
    try {
      await addBloodPressureRecord({
        systolic: parseInt(systolic),
        diastolic: parseInt(diastolic),
        pulse: pulse ? parseInt(pulse) : undefined,
        note: note || undefined
      });
      
      Taro.showToast({ title: '记录成功', icon: 'success' });
      
      // 清空表单
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setNote('');
      
      // 返回上一页
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 快速输入参考值
  const quickValues = [
    { sys: 120, dia: 80, label: '正常血压' },
    { sys: 130, dia: 85, label: '正常高值' },
  ];

  return (
    <View className="blood-pressure-page">
      {/* 参考标准说明 */}
      <View className="reference-banner">
        <Tips size={24} color="#01579b" />
        <Text className="reference-text">正常血压：收缩压 90-120 / 舒张压 60-80 mmHg</Text>
      </View>

      {/* 快速输入 */}
      <SectionTitle title="快速输入" />
      <View className="quick-input">
        {quickValues.map((item, index) => (
          <View 
            key={index}
            className="quick-input__item"
            onClick={() => {
              setSystolic(String(item.sys));
              setDiastolic(String(item.dia));
            }}
          >
            <Text className="quick-input__value">{item.sys}/{item.dia}</Text>
            <Text className="quick-input__label">{item.label}</Text>
          </View>
        ))}
      </View>

      {/* 血压输入表单 */}
      <SectionTitle title="手动录入" />
      <View className="form-card">
        <View className="input-row">
          <View className="input-group">
            <LargeInput
              label="收缩压（高压）"
              value={systolic}
              onChange={setSystolic}
              type="digit"
              placeholder="如：120"
              maxLength={3}
            />
            <Text className="input-unit">mmHg</Text>
          </View>
          <View className="input-group">
            <LargeInput
              label="舒张压（低压）"
              value={diastolic}
              onChange={setDiastolic}
              type="digit"
              placeholder="如：80"
              maxLength={3}
            />
            <Text className="input-unit">mmHg</Text>
          </View>
        </View>
        
        <LargeInput
          label="脉搏（选填）"
          value={pulse}
          onChange={setPulse}
          type="digit"
          placeholder="如：72"
          maxLength={3}
        />
        
        <LargeInput
          label="备注（选填）"
          value={note}
          onChange={setNote}
          placeholder="如：餐后测量、运动后等"
        />
      </View>

      {/* 提交按钮 */}
      <View className="submit-area">
        <LargeButton
          type="primary"
          size="large"
          loading={loading}
          block
          onClick={handleSubmit}
        >
          保存记录
        </LargeButton>
      </View>
    </View>
  );
}
