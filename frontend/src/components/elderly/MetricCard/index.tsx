import React from 'react'
import { View, Text } from '@tarojs/components'
import './index.scss'

export interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  subtitle?: string
  status?: 'normal' | 'warning' | 'danger'
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  loading?: boolean
  onClick?: () => void
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  status = 'normal',
  trend,
  trendValue,
  loading = false,
  onClick,
}) => {
  const statusText = {
    normal: '正常',
    warning: '偏高',
    danger: '异常',
  }

  if (loading) {
    return (
      <View className="metric-card metric-card--loading">
        <View className="metric-card__skeleton metric-card__skeleton--title" />
        <View className="metric-card__skeleton metric-card__skeleton--subtitle" />
        <View className="metric-card__skeleton metric-card__skeleton--value" />
        <View className="metric-card__skeleton metric-card__skeleton--footer" />
      </View>
    )
  }
  
  return (
    <View 
      className={`metric-card metric-card--${status}`}
      onClick={onClick}
      aria-label={`${title}：${value}${unit || ''}，${statusText[status]}`}
      role="button"
    >
      <Text className="metric-card__title">{title}</Text>
      {subtitle && <Text className="metric-card__subtitle">{subtitle}</Text>}
      <View className="metric-card__value-row">
        <Text className="metric-card__value">{value}</Text>
        {unit && <Text className="metric-card__unit">{unit}</Text>}
      </View>
      <View className="metric-card__footer">
        <Text className={`metric-card__status metric-card__status--${status}`}>
          {statusText[status]}
        </Text>
        {trend && trendValue && (
          <Text className={`metric-card__trend metric-card__trend--${trend}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </Text>
        )}
      </View>
    </View>
  )
}
