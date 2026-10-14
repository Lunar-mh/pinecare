import { View, Text, Button } from '@tarojs/components'
import { Icon, type IconName } from '../icons'

type EmptyStateProps = {
  /** 标题文字 */
  title?: string
  /** 描述文字 */
  description?: string
  /** 图标名称 */
  icon?: IconName
  /** 自定义图标颜色 */
  iconColor?: string
  /** 操作按钮文字 */
  actionText?: string
  /** 操作按钮点击回调 */
  onAction?: () => void
  /** 是否显示加载状态 */
  loading?: boolean
  /** 自定义类名 */
  className?: string
  /** 紧凑模式 */
  compact?: boolean
}

// 预设的空状态类型
type EmptyPreset = 'no-data' | 'no-result' | 'no-network' | 'error' | 'no-message' | 'no-task' | 'no-record'

const PRESETS: Record<EmptyPreset, Omit<EmptyStateProps, 'onAction' | 'actionText' | 'className' | 'compact'>> = {
  'no-data': {
    title: '暂无数据',
    description: '当前没有可显示的内容',
    icon: 'inbox',
    iconColor: '#94A3B8',
  },
  'no-result': {
    title: '无搜索结果',
    description: '换个关键词试试吧',
    icon: 'search',
    iconColor: '#94A3B8',
  },
  'no-network': {
    title: '网络连接失败',
    description: '请检查网络设置后重试',
    icon: 'wifi-off',
    iconColor: '#EF4444',
  },
  'error': {
    title: '加载失败',
    description: '请稍后重试',
    icon: 'alert-circle',
    iconColor: '#EF4444',
  },
  'no-message': {
    title: '暂无消息',
    description: '有新消息会第一时间通知您',
    icon: 'bell',
    iconColor: '#94A3B8',
  },
  'no-task': {
    title: '暂无任务',
    description: '当前没有待处理的任务',
    icon: 'clipboard',
    iconColor: '#94A3B8',
  },
  'no-record': {
    title: '暂无记录',
    description: '还没有相关的历史记录',
    icon: 'clock',
    iconColor: '#94A3B8',
  },
}

/**
 * 空状态组件
 * 用于列表、搜索结果等场景的空状态展示
 */
export function EmptyState({
  title,
  description,
  icon = 'inbox',
  iconColor = '#94A3B8',
  actionText,
  onAction,
  loading = false,
  className = '',
  compact = false,
}: EmptyStateProps) {
  if (loading) {
    return (
      <View className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-16'} ${className}`}>
        <View className="w-12 h-12 border-4 border-gray-200 border-t-yinban-primary rounded-full animate-spin" />
        <Text className="mt-4 text-gray-500">加载中...</Text>
      </View>
    )
  }

  return (
    <View className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-16'} ${className}`}>
      {/* 图标 */}
      <View className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} bg-gray-100 rounded-full flex items-center justify-center mb-4`}>
        <Icon name={icon} size={compact ? 32 : 48} color={iconColor} />
      </View>
      
      {/* 标题 */}
      {title && (
        <Text className={`${compact ? 'text-base' : 'text-lg'} font-medium text-gray-700 mb-2`}>
          {title}
        </Text>
      )}
      
      {/* 描述 */}
      {description && (
        <Text className={`${compact ? 'text-sm' : 'text-base'} text-gray-400 text-center px-8 mb-4`}>
          {description}
        </Text>
      )}
      
      {/* 操作按钮 */}
      {actionText && onAction && (
        <Button
          className="mt-2 px-6 py-2 bg-yinban-primary text-white rounded-full text-base font-medium"
          onClick={onAction}
        >
          {actionText}
        </Button>
      )}
    </View>
  )
}

/**
 * 预设空状态组件
 * 提供常用的空状态预设
 */
export function EmptyStatePreset({
  preset,
  actionText,
  onAction,
  className,
  compact,
}: {
  preset: EmptyPreset
  actionText?: string
  onAction?: () => void
  className?: string
  compact?: boolean
}) {
  const config = PRESETS[preset]
  return (
    <EmptyState
      {...config}
      actionText={actionText}
      onAction={onAction}
      className={className}
      compact={compact}
    />
  )
}

export default EmptyState
