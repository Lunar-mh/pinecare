import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'

export type UserRole = 'elder' | 'family'

const ROLE_KEY = 'userRole'

export function useRole() {
  const [role, setRoleState] = useState<UserRole>('elder')

  useEffect(() => {
    try {
      const stored = Taro.getStorageSync(ROLE_KEY) as UserRole
      if (stored === 'elder' || stored === 'family') {
        setRoleState(stored)
      }
    } catch (_) {}
  }, [])

  const setRole = useCallback((newRole: UserRole) => {
    Taro.setStorageSync(ROLE_KEY, newRole)
    setRoleState(newRole)
  }, [])

  const clearRole = useCallback(() => {
    Taro.removeStorageSync(ROLE_KEY)
    setRoleState('elder')
  }, [])

  return {
    role,
    isElder: role === 'elder',
    isFamily: role === 'family',
    setRole,
    clearRole,
  }
}
