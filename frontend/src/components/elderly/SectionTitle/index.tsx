import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

/**
 * SectionTitle 章节标题
 * 用于页面分区块的标题，带左侧装饰线
 * 适老化设计：大字号、醒目颜色、清晰视觉分隔
 */
export interface SectionTitleProps {
  /** 标题文本 */
  title: string;
  /** 右侧操作文本 */
  action?: string;
  /** 操作点击回调 */
  onAction?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  action,
  onAction,
  className = ''
}) => {
  return (
    <View className={`section-title ${className}`}>
      <View className="section-title__left">
        <View className="section-title__indicator" />
        <Text className="section-title__text">{title}</Text>
      </View>
      {action && (
        <Text 
          className="section-title__action"
          onClick={onAction}
        >
          {action}
        </Text>
      )}
    </View>
  );
};

export default SectionTitle;
