import React, { useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export interface MetricCardProps {
  /** 指标名称 (如: "血压", "心率", "血糖") */
  title: string
  /** 核心数值 (42~48px 超大显眼) */
  value: string | number
  /** 物理单位 (如: "mmHg", "次/分", "mmol/L") */
  unit?: string
  /** 适老标准参考区间说明 (如: "正常范围: 90~140") */
  referenceRange?: string
  /** 次级说明/副标题 */
  subtitle?: string
  /** 健康体征状态 */
  status?: 'normal' | 'warning' | 'danger'
  /** 自定义状态文字 (默认由 status 推导: 正常 / 偏高 / 异常) */
  statusText?: string
  /** 趋势走向 */
  trend?: 'up' | 'down' | 'stable'
  /** 趋势量化文本 (如: "比昨日 +4") */
  trendValue?: string
  /** 测量时间戳文本 (如: "今日 08:30") */
  measuredAt?: string
  /** 专属体征图标 (如心形、血压计) */
  icon?: React.ReactNode
  /** 加载骨架屏状态 */
  loading?: boolean
  /** 点击回调 */
  onClick?: () => void
  /** 无障碍读屏标签 */
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * 适老化健康指标微晶大字卡 (MetricCard)
 * 42~48px 超大等宽数值，基线对齐单位，状态指示晶条与文字徽章
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  referenceRange,
  subtitle,
  status = 'normal',
  statusText,
  trend,
  trendValue,
  measuredAt,
  icon,
  loading = false,
  onClick,
  ariaLabel,
  className = '',
  style,
}) => {
  const defaultStatusLabels: Record<'normal' | 'warning' | 'danger', string> = {
    normal: '✓ 正常',
    warning: '▲ 偏高',
    danger: '! 异常',
  }

  const resolvedStatusText = statusText || defaultStatusLabels[status]

  const handleClick = useCallback(() => {
    if (!onClick) return
    try {
      Taro.vibrateShort({ type: 'light' })
    } catch (_) {}
    onClick()
  }, [onClick])

  if (loading) {
    return (
      <View className={`metric-card metric-card--loading ${className}`} style={style}>
        <View className="metric-card__skeleton metric-card__skeleton--title" />
        <View className="metric-card__skeleton metric-card__skeleton--value" />
        <View className="metric-card__skeleton metric-card__skeleton--footer" />
      </View>
    )
  }

  const accessibleText =
    ariaLabel ||
    `${title}：${value}${unit || ''}，${resolvedStatusText}${
      referenceRange ? `，${referenceRange}` : ''
    }`

  const cardClasses = [
    'metric-card',
    `metric-card--${status}`,
    onClick ? 'metric-card--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View
      className={cardClasses}
      style={style}
      onClick={onClick ? handleClick : undefined}
      aria-label={accessibleText}
      role={onClick ? 'button' : 'article'}
    >
      {/* 顶部标题行与专属图标 */}
      <View className="metric-card__header">
        <View className="metric-card__header-left">
          {icon && <View className="metric-card__icon">{icon}</View>}
          <Text className="metric-card__title">{title}</Text>
        </View>
        {measuredAt && <Text className="metric-card__measured-at">{measuredAt}</Text>}
      </View>

      {/* 超大核心指标与基线对齐单位 */}
      <View className="metric-card__value-row">
        <Text className="metric-card__value">{value}</Text>
        {unit && <Text className="metric-card__unit">{unit}</Text>}
      </View>

      {/* 参考区间与副标题 */}
      {(referenceRange || subtitle) && (
        <View className="metric-card__desc-row">
          {referenceRange && (
            <Text className="metric-card__reference">{referenceRange}</Text>
          )}
          {subtitle && !referenceRange && (
            <Text className="metric-card__subtitle">{subtitle}</Text>
          )}
        </View>
      )}

      {/* 底部状态徽章与趋势 */}
      <View className="metric-card__footer">
        <View className={`metric-card__badge metric-card__badge--${status}`}>
          <Text className="metric-card__badge-text">{resolvedStatusText}</Text>
        </View>
        {trend && trendValue && (
          <View className={`metric-card__trend metric-card__trend--${trend}`}>
            <Text className="metric-card__trend-text">
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default MetricCard
