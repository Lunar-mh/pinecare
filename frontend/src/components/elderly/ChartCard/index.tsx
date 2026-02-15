import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

/**
 * ChartCard 图表卡片
 * 用于展示ECharts图表的容器组件
 * 适老化设计：大标题、清晰边框、充足留白
 */
export interface ChartCardProps {
  /** 卡片标题 */
  title: string;
  /** 副标题/单位 */
  subtitle?: string;
  /** 图表内容 */
  children: React.ReactNode;
  /** 额外操作按钮 */
  extra?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 图表高度 */
  height?: number;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  extra,
  className = '',
  height = 240
}) => {
  return (
    <View className={`chart-card ${className}`}>
      <View className="chart-card__header">
        <View className="chart-card__title-group">
          <Text className="chart-card__title">{title}</Text>
          {subtitle && (
            <Text className="chart-card__subtitle">{subtitle}</Text>
          )}
        </View>
        {extra && (
          <View className="chart-card__extra">
            {extra}
          </View>
        )}
      </View>
      <View className="chart-card__body" style={{ height: `${height}px` }}>
        {children}
      </View>
    </View>
  );
};

export default ChartCard;
