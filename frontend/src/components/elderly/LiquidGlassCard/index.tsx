import React, { useCallback } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export interface LiquidGlassCardProps {
  /** 子元素内容 */
  children?: React.ReactNode
  /** 卡片形态变体: default(默认微晶) | elevated(浮空高亮) | sunken(内嵌凹槽) | accent(暖栗关怀) | danger(朱砂急救) */
  variant?: 'default' | 'elevated' | 'sunken' | 'accent' | 'danger'
  /** 内边距规格: none(0) | sm(12px) | md(20px 适老标准) | lg(28px) */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** 圆角规格: md(16px) | lg(24px) | xl(32px 适老Bento) | pill(全圆角40px) */
  rounded?: 'md' | 'lg' | 'xl' | 'pill'
  /** 是否开启点击交互与按压动效 */
  interactive?: boolean
  /** 点击是否触发轻触震动 (默认 true) */
  haptic?: boolean
  /** 点击回调 */
  onClick?: (e?: any) => void
  /** 无障碍语音标签 */
  ariaLabel?: string
  /** ARIA 角色 (默认 button 或 article) */
  role?: string
  /** 头部插槽 */
  header?: React.ReactNode
  /** 底部插槽 */
  footer?: React.ReactNode
  /** 边缘次表面呼吸微光 */
  glowTone?: 'emerald' | 'amber' | 'cinnabar' | 'none'
  /** 额外 CSS 类名与行内样式 */
  className?: string
  style?: React.CSSProperties
}

/**
 * 暖玉微晶卡片容器 (LiquidGlassCard)
 * 具备多层拟态微晶、次表面微光边框、顶部高光反光、暖漫射软阴影与触感震动反馈
 */
export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  rounded = 'xl',
  interactive = false,
  haptic = true,
  onClick,
  ariaLabel,
  role,
  header,
  footer,
  glowTone = 'none',
  className = '',
  style,
}) => {
  const isClickable = Boolean(interactive || onClick)

  const handleClick = useCallback(
    (e: any) => {
      if (!isClickable) return

      if (haptic) {
        try {
          Taro.vibrateShort({ type: 'light' })
        } catch (_) {
          // 在不支持震动的环境或模拟器下静默降级
        }
      }

      if (onClick) {
        onClick(e)
      }
    },
    [isClickable, haptic, onClick]
  )

  const cardClasses = [
    'liquid-glass-card',
    `liquid-glass-card--variant-${variant}`,
    `liquid-glass-card--padding-${padding}`,
    `liquid-glass-card--rounded-${rounded}`,
    glowTone !== 'none' ? `liquid-glass-card--glow-${glowTone}` : '',
    isClickable ? 'liquid-glass-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View
      className={cardClasses}
      style={style}
      onClick={isClickable ? handleClick : undefined}
      aria-label={ariaLabel}
      role={role || (isClickable ? 'button' : 'article')}
    >
      {header && <View className="liquid-glass-card__header">{header}</View>}
      <View className="liquid-glass-card__body">{children}</View>
      {footer && <View className="liquid-glass-card__footer">{footer}</View>}
    </View>
  )
}

export default LiquidGlassCard
