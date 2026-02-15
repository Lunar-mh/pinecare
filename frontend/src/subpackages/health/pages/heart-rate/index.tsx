import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Tips } from '@nutui/icons-react-taro';
import { LargeInput, LargeButton, SectionTitle } from '@/components/elderly';
import { addHeartRateRecord } from '@/services/modules/health';
import './index.scss';

export default function HeartRatePage() {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // 验证输入
  const validateInput = () => {
    const hr = parseInt(value);
    
    if (!value) {
      Taro.showToast({ title: '请输入心率', icon: 'none' });
      return false;
    }
    
    if (isNaN(hr) || hr < 40 || hr > 200) {
      Taro.showToast({ title: '心率范围: 40-200', icon: 'none' });
      return false;
    }
    
    return true;
  };

  // 提交记录
  const handleSubmit = async () => {
    if (!validateInput()) return;
    
    setLoading(true);
    try {
      await addHeartRateRecord({
        value: parseInt(value),
        note: note || undefined
      });
      
      Taro.showToast({ title: '记录成功', icon: 'success' });
      
      // 清空表单
      setValue('');
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
    { value: 60, label: '静息心率', desc: '运动员' },
    { value: 72, label: '正常心率', desc: '成年人' },
    { value: 80, label: '正常心率', desc: '老年人' },
  ];

  return (
    <View className="heart-rate-page">
      {/* 参考标准说明 */}
      <View className="reference-banner">
        <Tips size={24} color="#01579b" />
        <Text className="reference-text">正常静息心率：60-100 次/分钟</Text>
      </View>

      {/* 快速输入 */}
      <SectionTitle title="快速输入" />
      <View className="quick-input">
        {quickValues.map((item, index) => (
          <View 
            key={index}
            className="quick-input__item"
            onClick={() => setValue(String(item.value))}
          >
            <Text className="quick-input__value">{item.value}</Text>
            <Text className="quick-input__label">{item.label}</Text>
            <Text className="quick-input__desc">{item.desc}</Text>
          </View>
        ))}
      </View>

      {/* 心率输入表单 */}
      <SectionTitle title="手动录入" />
      <View className="form-card">
        <View className="input-group">
          <LargeInput
            label="心率"
            value={value}
            onChange={setValue}
            type="digit"
            placeholder="如：72"
            maxLength={3}
          />
          <Text className="input-unit">次/分钟</Text>
        </View>
        
        <LargeInput
          label="备注（选填）"
          value={note}
          onChange={setNote}
          placeholder="如：运动后、服药后等"
        />
      </View>

      {/* 心率参考表 */}
      <SectionTitle title="心率参考" />
      <View className="reference-table">
        <View className="reference-row reference-row--header">
          <Text className="reference-col">状态</Text>
          <Text className="reference-col">心率范围</Text>
        </View>
        <View className="reference-row">
          <Text className="reference-col">心动过缓</Text>
          <Text className="reference-col reference-col--danger">&lt; 60</Text>
        </View>
        <View className="reference-row">
          <Text className="reference-col">正常</Text>
          <Text className="reference-col reference-col--success">60-100</Text>
        </View>
        <View className="reference-row">
          <Text className="reference-col">心动过速</Text>
          <Text className="reference-col reference-col--danger">&gt; 100</Text>
        </View>
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
