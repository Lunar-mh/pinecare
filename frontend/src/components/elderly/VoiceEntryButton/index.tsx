import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

/**
 * VoiceEntryButton 语音入口按钮
 * 规格：48px × 48px，使用玻璃态效果（glassmorphism）
 * 使用场景：页面标题栏右侧语音搜索入口
 * 适老化设计：充足的点击区域，高对比度图标
 */
export interface VoiceEntryButtonProps {
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const VoiceEntryButton: React.FC<VoiceEntryButtonProps> = ({
  onClick,
  className = ''
}) => {
  return (
    <View 
      className={`voice-entry-btn ${className}`}
      onClick={onClick}
      role="button"
      aria-label="语音助手"
    >
      <View className="voice-icon">
        <View className="voice-wave">
          <View className="wave-bar wave-bar-1" />
          <View className="wave-bar wave-bar-2" />
          <View className="wave-bar wave-bar-3" />
        </View>
      </View>
    </View>
  );
};

export default VoiceEntryButton;
