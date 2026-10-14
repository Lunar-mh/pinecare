#!/usr/bin/env python3
import os
import sys

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
reset_password_dir = os.path.join(script_dir, 'src', 'pages', 'reset-password')

# Create directory
os.makedirs(reset_password_dir, exist_ok=True)
print(f'✓ Created/confirmed directory: {reset_password_dir}')

# Create index.config.ts
config_content = '''export default definePageConfig({
  navigationBarTitleText: '重置密码',
  navigationBarBackgroundColor: '#01579b',
  navigationBarTextStyle: 'white',
})
'''

with open(os.path.join(reset_password_dir, 'index.config.ts'), 'w', encoding='utf-8') as f:
    f.write(config_content)
print('✓ Created file: index.config.ts')

# Create index.tsx
index_content = '''import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'
import { Icon } from '@/components/icons'

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [countdown])

  // Phone validation: 11 digits starting with 1
  const isPhoneValid = useCallback((val: string) => /^1[3-9]\\d{9}$/.test(val), [])

  // Password validation: 8+ chars with uppercase, lowercase, digit
  const isPasswordValid = useCallback((pwd: string) => {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /\\d/.test(pwd)
    )
  }, [])

  // Step 1: Request password reset
  const handleRequestReset = useCallback(async () => {
    if (countdown > 0) return
    if (!isPhoneValid(phone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    try {
      setLoading(true)
      await requestPasswordReset({ phone })
      Taro.showToast({ title: '验证码已发送', icon: 'success' })
      setCountdown(60)
      setStep(2)
    } catch (error) {
      const err = error as { message?: string }
      Taro.showToast({ title: err.message || '发送失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, countdown, isPhoneValid])

  // Step 2: Verify code
  const handleVerifyCode = useCallback(async () => {
    if (code.length !== 6) {
      Taro.showToast({ title: '请输入 6 位验证码', icon: 'none' })
      return
    }
    setStep(3)
  }, [code])

  // Step 3: Confirm new password
  const handleConfirmPassword = useCallback(async () => {
    if (!isPasswordValid(newPassword)) {
      Taro.showToast({ title: '密码需要 8+ 字符，包含大小写字母和数字', icon: 'none' })
      return
    }
    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次输入的密码不一致', icon: 'none' })
      return
    }

    try {
      setLoading(true)
      await confirmPasswordReset({ phone, code, newPassword })
      Taro.showToast({ title: '重置成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      const err = error as { message?: string }
      Taro.showToast({ title: err.message || '重置失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [newPassword, confirmPassword, phone, code, isPasswordValid])

  return (
    <View className="min-h-screen bg-white flex flex-col">
      {/* 顶部 Hero 区域 */}
      <View className="pt-24 px-8 pb-10 flex flex-col items-center">
        <View className="w-20 h-20 bg-yinban-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Icon name="lock" size={48} color="#01579b" />
        </View>
        <Text className="text-dash-hero font-bold text-dash-text-main mb-3">重置密码</Text>
        <Text className="text-dash-body text-dash-text-sub text-center">
          {step === 1 && '输入注册手机号，我们将发送验证码到您的手机'}
          {step === 2 && '请输入收到的 6 位验证码'}
          {step === 3 && '设置新密码，需要包含大小写字母和数字'}
        </Text>
      </View>

      {/* 进度指示器 */}
      <View className="px-8 mb-8 flex justify-between">
        {[1, 2, 3].map((s) => (
          <View key={s} className="flex flex-col items-center flex-1">
            <View className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-dash-tiny transition-all ${step >= s ? 'bg-yinban-primary' : 'bg-dash-border'}`}>
              <Text>{s}</Text>
            </View>
            <Text className={`text-dash-tiny mt-2 text-center ${step >= s ? 'text-yinban-primary font-medium' : 'text-dash-text-sub'}`}>
              {`Step ${s}`}
            </Text>
          </View>
        ))}
      </View>

      {/* 表单区域 */}
      <View className="px-8 flex-1">
        {/* Step 1: 手机号 */}
        {step === 1 && (
          <View className="space-y-6">
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="phone" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type="number"
                maxlength={11}
                value={phone}
                placeholder="请输入手机号"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setPhone(event.detail.value.replace(/\\D/g, '').slice(0, 11))}
              />
            </View>

            <View 
              className={`h-14 rounded-full flex items-center justify-center transition-all ${loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'}`}
              onClick={loading ? undefined : handleRequestReset}
            >
              <Text className="text-white text-dash-title font-bold">
                {countdown > 0 ? `${countdown}s 后重新获取` : '发送验证码'}
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: 验证码 */}
        {step === 2 && (
          <View className="space-y-6">
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="shield-check" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type="number"
                maxlength={6}
                value={code}
                placeholder="请输入 6 位验证码"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setCode(event.detail.value.replace(/\\D/g, '').slice(0, 6))}
              />
            </View>

            <View 
              className={`h-14 rounded-full flex items-center justify-center transition-all bg-yinban-primary active:scale-[0.98]`}
              onClick={code.length === 6 ? handleVerifyCode : undefined}
            >
              <Text className={`text-dash-title font-bold ${code.length === 6 ? 'text-white' : 'text-white/50'}`}>
                下一步
              </Text>
            </View>

            <View 
              className="h-12 rounded-full flex items-center justify-center border-2 border-yinban-primary active:bg-yinban-primary/10"
              onClick={() => setStep(1)}
            >
              <Text className="text-yinban-primary text-dash-title font-medium">返回</Text>
            </View>
          </View>
        )}

        {/* Step 3: 新密码 */}
        {step === 3 && (
          <View className="space-y-6">
            {/* 新密码输入 */}
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="lock" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                placeholder="请输入新密码"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setNewPassword(event.detail.value)}
              />
              <View 
                className="p-2 active:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? 'eye' : 'eye-off'} size={20} color="#64748B" />
              </View>
            </View>

            {/* 确认密码输入 */}
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="lock" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                placeholder="请确认密码"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setConfirmPassword(event.detail.value)}
              />
              <View 
                className="p-2 active:opacity-50"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#64748B" />
              </View>
            </View>

            {/* 密码要求显示 */}
            <View className="bg-yinban-bg/50 rounded-2xl p-4 space-y-2">
              <View className="flex items-center">
                <Icon 
                  name={newPassword.length >= 8 ? 'check-circle' : 'circle'} 
                  size={18} 
                  color={newPassword.length >= 8 ? '#10B981' : '#94A3B8'} 
                />
                <Text className={`text-dash-tiny ml-2 ${newPassword.length >= 8 ? 'text-dash-text-main' : 'text-dash-text-sub'}`}>
                  至少 8 个字符
                </Text>
              </View>
              <View className="flex items-center">
                <Icon 
                  name={/[A-Z]/.test(newPassword) ? 'check-circle' : 'circle'} 
                  size={18} 
                  color={/[A-Z]/.test(newPassword) ? '#10B981' : '#94A3B8'} 
                />
                <Text className={`text-dash-tiny ml-2 ${/[A-Z]/.test(newPassword) ? 'text-dash-text-main' : 'text-dash-text-sub'}`}>
                  包含大写字母
                </Text>
              </View>
              <View className="flex items-center">
                <Icon 
                  name={/[a-z]/.test(newPassword) ? 'check-circle' : 'circle'} 
                  size={18} 
                  color={/[a-z]/.test(newPassword) ? '#10B981' : '#94A3B8'} 
                />
                <Text className={`text-dash-tiny ml-2 ${/[a-z]/.test(newPassword) ? 'text-dash-text-main' : 'text-dash-text-sub'}`}>
                  包含小写字母
                </Text>
              </View>
              <View className="flex items-center">
                <Icon 
                  name={/\\d/.test(newPassword) ? 'check-circle' : 'circle'} 
                  size={18} 
                  color={/\\d/.test(newPassword) ? '#10B981' : '#94A3B8'} 
                />
                <Text className={`text-dash-tiny ml-2 ${/\\d/.test(newPassword) ? 'text-dash-text-main' : 'text-dash-text-sub'}`}>
                  包含数字
                </Text>
              </View>
            </View>

            <View 
              className={`h-14 rounded-full flex items-center justify-center transition-all ${loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'}`}
              onClick={loading ? undefined : handleConfirmPassword}
            >
              <Text className="text-white text-dash-title font-bold">
                {loading ? '重置中...' : '完成重置'}
              </Text>
            </View>

            <View 
              className="h-12 rounded-full flex items-center justify-center border-2 border-yinban-primary active:bg-yinban-primary/10"
              onClick={() => setStep(2)}
            >
              <Text className="text-yinban-primary text-dash-title font-medium">返回</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
'''

with open(os.path.join(reset_password_dir, 'index.tsx'), 'w', encoding='utf-8') as f:
    f.write(index_content)
print('✓ Created file: index.tsx')

print('\n✅ All files created successfully!')
print(f'   Directory: {reset_password_dir}')
