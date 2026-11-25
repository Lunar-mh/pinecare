import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { roleThemes } from '../design/tokens'

export type UserRole = 'elder' | 'family'

const ROLE_KEY = 'userRole'

function getInitialRole(): UserRole {
  try {
    const stored = Taro.getStorageSync(ROLE_KEY)
    if (stored === 'elder' || stored === 'family') {
      return stored
    }
  } catch (_) {}
  return 'elder'
}

export interface UseRoleReturn {
  /** 当前角色 */
  role: UserRole
  /** 是否长辈模式 (存量别名) */
  isElder: boolean
  /** 是否长辈模式 (规范契约标准别名) */
  isElderly: boolean
  /** 是否家属模式 */
  isFamily: boolean
  /** 切换角色并持久化与重定向 */
  setRole: (newRole: UserRole, options?: { reLaunch?: boolean }) => void
  /** 重置角色为默认长辈 */
  clearRole: () => void
  /** 当前角色对应的设计令牌 */
  theme: typeof roleThemes.elder | typeof roleThemes.family
}

/**
 * 双模式 (老人模式 / 家属模式) 状态解耦 Hook
 * - 同步首读 Storage 消除冷启动首帧闪烁 (Hydration Flicker)
 * - 导出 isElderly 标准契约别名
 * - 集成 Taro.eventCenter 全局轻量事件总线广播
 */
export function useRole(): UseRoleReturn {
  // 同步首读，杜绝异步导致的第 1 帧闪烁
  const [role, setRoleState] = useState<UserRole>(getInitialRole)

  // 跨组件响应式同步 (监听其他组件发出的角色变更事件)
  useEffect(() => {
    const handleRoleBroadcast = (newRole: UserRole) => {
      if (newRole && (newRole === 'elder' || newRole === 'family')) {
        setRoleState(newRole)
      }
    }

    Taro.eventCenter.on('app:roleChange', handleRoleBroadcast)
    return () => {
      Taro.eventCenter.off('app:roleChange', handleRoleBroadcast)
    }
  }, [])

  const setRole = useCallback((newRole: UserRole, options: { reLaunch?: boolean } = { reLaunch: true }) => {
    try {
      Taro.setStorageSync(ROLE_KEY, newRole)
      Taro.setStorageSync('roleSelectTime', Date.now())
    } catch (_) {}

    setRoleState(newRole)
    // 广播全局事件通知常驻组件 (如 CustomTabBar) 就地更新
    Taro.eventCenter.trigger('app:roleChange', newRole)

    if (options.reLaunch !== false) {
      const url = newRole === 'elder' ? '/pages/index/index' : '/pages/dashboard/index'
      Taro.reLaunch({ url })
    }
  }, [])

  const clearRole = useCallback(() => {
    try {
      Taro.removeStorageSync(ROLE_KEY)
    } catch (_) {}
    setRoleState('elder')
    Taro.eventCenter.trigger('app:roleChange', 'elder')
  }, [])

  return {
    role,
    isElder: role === 'elder',
    isElderly: role === 'elder',
    isFamily: role === 'family',
    setRole,
    clearRole,
    theme: roleThemes[role],
  }
}

export default useRole
