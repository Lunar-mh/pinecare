import React from 'react'
import { View, Text } from '@tarojs/components'
import './index.scss'

export interface LargeButtonProps {
  children: React.ReactNode
  type?: 'primary' | 'default' | 'danger'
  size?: 'large' | 'medium'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  icon?: React.ReactNode
  onClick?: () => void
  ariaLabel?: string
}

export const LargeButton: React.FC<LargeButtonProps> = ({
  children,
  type = 'primary',
  size = 'large',
  disabled = false,
  loading = false,
  block = false,
  icon,
  onClick,
  ariaLabel,
}) => {
  return (
    <View
      className={`elderly-button elderly-button--${type} elderly-button--${size} ${disabled || loading ? 'elderly-button--disabled' : ''} ${block ? 'elderly-button--block' : ''}`}
      onClick={!disabled && !loading ? onClick : undefined}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-disabled={disabled || loading}
      role="button"
    >
      {loading && <View className="elderly-button__loading" />}
      {icon && <View className="elderly-button__icon">{icon}</View>}
      <Text className="elderly-button__text">{children}</Text>
    </View>
  )
}
