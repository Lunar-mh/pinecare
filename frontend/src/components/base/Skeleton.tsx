import { View, Text } from '@tarojs/components'

type SkeletonProps = {
  /** 骨架屏类型 */
  type?: 'text' | 'avatar' | 'card' | 'list' | 'detail'
  /** 行数（仅对text和list类型有效） */
  rows?: number
  /** 是否显示动画 */
  animate?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 骨架屏组件
 * 在内容加载时显示占位效果
 */
export function Skeleton({
  type = 'text',
  rows = 3,
  animate = true,
  className = '',
}: SkeletonProps) {
  const animateClass = animate ? 'animate-pulse' : ''

  // 文本骨架
  if (type === 'text') {
    return (
      <View className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <View
            key={i}
            className={`h-4 bg-gray-200 rounded ${animateClass}`}
            style={{ width: i === rows - 1 ? '60%' : '100%' }}
          />
        ))}
      </View>
    )
  }

  // 头像骨架
  if (type === 'avatar') {
    return (
      <View className={`flex items-center space-x-4 ${className}`}>
        <View className={`w-12 h-12 bg-gray-200 rounded-full ${animateClass}`} />
        <View className="flex-1 space-y-2">
          <View className={`h-4 bg-gray-200 rounded w-3/4 ${animateClass}`} />
          <View className={`h-3 bg-gray-200 rounded w-1/2 ${animateClass}`} />
        </View>
      </View>
    )
  }

  // 卡片骨架
  if (type === 'card') {
    return (
      <View className={`bg-white rounded-2xl p-4 shadow-sm ${className}`}>
        <View className={`h-32 bg-gray-200 rounded-xl mb-4 ${animateClass}`} />
        <View className={`h-5 bg-gray-200 rounded w-3/4 mb-2 ${animateClass}`} />
        <View className={`h-4 bg-gray-200 rounded w-1/2 ${animateClass}`} />
      </View>
    )
  }

  // 列表骨架
  if (type === 'list') {
    return (
      <View className={`space-y-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} className="flex items-center p-4 bg-white rounded-xl">
            <View className={`w-12 h-12 bg-gray-200 rounded-xl mr-4 ${animateClass}`} />
            <View className="flex-1 space-y-2">
              <View className={`h-4 bg-gray-200 rounded w-3/4 ${animateClass}`} />
              <View className={`h-3 bg-gray-200 rounded w-1/2 ${animateClass}`} />
            </View>
            <View className={`w-6 h-6 bg-gray-200 rounded ${animateClass}`} />
          </View>
        ))}
      </View>
    )
  }

  // 详情骨架
  if (type === 'detail') {
    return (
      <View className={`space-y-6 ${className}`}>
        {/* 头部 */}
        <View className="flex items-center space-x-4">
          <View className={`w-20 h-20 bg-gray-200 rounded-2xl ${animateClass}`} />
          <View className="flex-1 space-y-2">
            <View className={`h-6 bg-gray-200 rounded w-1/2 ${animateClass}`} />
            <View className={`h-4 bg-gray-200 rounded w-3/4 ${animateClass}`} />
          </View>
        </View>
        
        {/* 信息区块 */}
        <View className="bg-white rounded-2xl p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="flex justify-between">
              <View className={`h-4 bg-gray-200 rounded w-20 ${animateClass}`} />
              <View className={`h-4 bg-gray-200 rounded w-32 ${animateClass}`} />
            </View>
          ))}
        </View>
        
        {/* 操作按钮 */}
        <View className={`h-12 bg-gray-200 rounded-xl ${animateClass}`} />
      </View>
    )
  }

  return null
}

/**
 * 页面级骨架屏
 */
export function PageSkeleton({ className = '' }: { className?: string }) {
  return (
    <View className={`p-4 ${className}`}>
      {/* 页面标题 */}
      <View className="mb-6">
        <View className="h-8 bg-gray-200 rounded w-1/3 animate-pulse mb-2" />
        <View className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
      </View>
      
      {/* 卡片区域 */}
      <View className="grid grid-cols-2 gap-4 mb-6">
        <View className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
        <View className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
      </View>
      
      {/* 列表区域 */}
      <Skeleton type="list" rows={4} />
    </View>
  )
}

export default Skeleton
