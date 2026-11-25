import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export interface LargeButtonProps {
  children: React.ReactNode
  type?: 'primary' | 'secondary' | 'danger' | 'glass' | 'ghost' | 'default'
  size?: 'large' | 'medium' | 'small'
  block?: boolean
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  haptic?: boolean
  longPress?: boolean
  longPressDuration?: number
  onClick?: (e?: any) => void
  onLongPress?: () => void
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * 适老化大触控按键 (LargeButton)
 * 主按键高度 64px (≥60px)，触控热区 ≥60×60px，内置轻触震动与 3s 长按倒计时
 */
export const LargeButton: React.FC<LargeButtonProps> = ({
  children,
  type = 'primary',
  size = 'large',
  block = false,
  disabled = false,
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  haptic = true,
  longPress = false,
  longPressDuration = 3000,
  onClick,
  onLongPress,
  ariaLabel,
  className = '',
  style,
}) => {
  // 归一化变体：'default' 映射为 'glass' 微晶质感
  const resolvedType = type === 'default' ? 'glass' : type

  const [pressing, setPressing] = useState(false)
  const [pressProgress, setPressProgress] = useState(0) // 0 到 100
  const timerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)
  const longPressTriggeredRef = useRef<boolean>(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPressing(false)
    setPressProgress(0)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!haptic) return
    try {
      Taro.vibrateShort({ type })
    } catch (_) {
      // 模拟器或硬件不支持时静默跳过
    }
  }, [haptic])

  const handleTouchStart = useCallback(() => {
    if (disabled || loading) return

    if (longPress && onLongPress) {
      longPressTriggeredRef.current = false
      setPressing(true)
      startTimeRef.current = Date.now()
      triggerHaptic('light')

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const progress = Math.min(100, Math.floor((elapsed / longPressDuration) * 100))
        setPressProgress(progress)

        if (elapsed >= longPressDuration) {
          clearInterval(timerRef.current)
          timerRef.current = null
          longPressTriggeredRef.current = true
          setPressing(false)
          setPressProgress(100)
          triggerHaptic('heavy')
          onLongPress()
        }
      }, 50)
    }
  }, [disabled, loading, longPress, longPressDuration, onLongPress, triggerHaptic])

  const handleTouchEnd = useCallback(() => {
    if (longPress) {
      clearTimer()
    }
  }, [longPress, clearTimer])

  const handleClick = useCallback((e: any) => {
    if (disabled || loading) return

    // 如果刚触发了长按，则抑制随后的普通点击
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }

    triggerHaptic('light')
    if (onClick) {
      onClick(e)
    }
  }, [disabled, loading, triggerHaptic, onClick])

  const buttonClasses = [
    'elderly-button',
    `elderly-button--${resolvedType}`,
    `elderly-button--${size}`,
    disabled ? 'elderly-button--disabled' : '',
    loading ? 'elderly-button--loading-state' : '',
    block ? 'elderly-button--block' : '',
    pressing ? 'elderly-button--pressing' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const accessibleLabel =
    ariaLabel ||
    (typeof children === 'string'
      ? `${children}${longPress ? '，长按3秒触发' : ''}`
      : undefined)

  return (
    <View
      className={buttonClasses}
      style={style}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      aria-label={accessibleLabel}
      aria-disabled={disabled || loading}
      role="button"
    >
      {/* 长按倒计时进度条 */}
      {longPress && pressing && (
        <View
          className="elderly-button__progress-overlay"
          style={{ width: `${pressProgress}%` }}
        />
      )}

      {/* 加载动画 */}
      {loading && <View className="elderly-button__loading" />}

      {/* 前置图标 */}
      {icon && iconPosition === 'left' && (
        <View className="elderly-button__icon elderly-button__icon--left">{icon}</View>
      )}

      {/* 按钮文字 */}
      <Text className="elderly-button__text">
        {loading && loadingText ? loadingText : children}
      </Text>

      {/* 后置图标 */}
      {icon && iconPosition === 'right' && (
        <View className="elderly-button__icon elderly-button__icon--right">{icon}</View>
      )}
    </View>
  )
}

export default LargeButton
