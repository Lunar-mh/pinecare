import os
import sys

# Create the directory
dir_path = r'D:\03_Study\Desktop\old\frontend\src\pages\reset-password'
os.makedirs(dir_path, exist_ok=True)
print(f'✓ Directory created/verified: {dir_path}')

# Create index.config.ts
config_content = """export default definePageConfig({
  navigationBarTitleText: '重置密码',
})"""

config_path = os.path.join(dir_path, 'index.config.ts')
with open(config_path, 'w', encoding='utf-8') as f:
    f.write(config_content)
print(f'✓ Created: index.config.ts')

# Create index.tsx
tsx_content = """import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button } from '@tarojs/components'
import { Eye, EyeClosed, ArrowLeft, Lock, Phone, ShieldCheck } from '@nutui/icons-react-taro'
import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'

export default function ResetPassword() {
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = async () => {
    if (!phone.trim()) {
      Taro.showToast({
        title: '请输入手机号',
        icon: 'error',
      })
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset({ phone })
      Taro.showToast({
        title: '验证码已发送',
        icon: 'success',
      })
      setCountdown(60)
      setStep(2)
    } catch (error) {
      Taro.showToast({
        title: '发送失败，请重试',
        icon: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCode = async () => {
    if (code.length !== 6) {
      Taro.showToast({
        title: '请输入6位验证码',
        icon: 'error',
      })
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset({
        phone,
        code,
      })
      setStep(3)
    } catch (error) {
      Taro.showToast({
        title: '验证码错误',
        icon: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Taro.showToast({
        title: '请输入新密码',
        icon: 'error',
      })
      return
    }

    if (newPassword.length < 6) {
      Taro.showToast({
        title: '密码至少6位',
        icon: 'error',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      Taro.showToast({
        title: '两次输入密码不一致',
        icon: 'error',
      })
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset({
        phone,
        code,
        newPassword,
      })
      Taro.showToast({
        title: '密码重置成功',
        icon: 'success',
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      Taro.showToast({
        title: '重置失败，请重试',
        icon: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      Taro.navigateBack()
    }
  }

  return (
    <View className="min-h-screen bg-yinban-bg px-6 py-8">
      {/* Header */}
      <View className="flex items-center justify-between mb-8">
        <Button
          className="p-0 bg-transparent border-0"
          onClick={handleBack}
        >
          <ArrowLeft size={24} color="#666" />
        </Button>
        <Text className="text-xl font-semibold text-gray-900">重置密码</Text>
        <View className="w-6" />
      </View>

      {/* Step Indicator */}
      <View className="flex justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            className={`h-2 w-8 rounded-full transition-all ${
              s <= step ? 'bg-yinban-primary' : 'bg-gray-200'
            }`}
          />
        ))}
      </View>

      {/* Step 1: Phone Input */}
      {step === 1 && (
        <View>
          <View className="mb-6">
            <Text className="block text-sm font-medium text-gray-700 mb-3">
              <Phone size={16} className="inline mr-2" />
              手机号码
            </Text>
            <Input
              type="tel"
              placeholder="请输入手机号码"
              value={phone}
              onInput={(e) => setPhone(e.detail.value)}
              maxLength={11}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:border-yinban-primary focus:outline-none"
            />
          </View>

          <Button
            className="w-full py-3 bg-yinban-primary text-white font-semibold rounded-2xl transition-opacity"
            disabled={loading || countdown > 0}
            onClick={handleSendCode}
          >
            {countdown > 0 ? `重新发送 (${countdown}s)` : '发送验证码'}
          </Button>
        </View>
      )}

      {/* Step 2: Code Input */}
      {step === 2 && (
        <View>
          <View className="mb-2">
            <Text className="text-gray-600 text-sm">
              验证码已发送至 {phone}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="block text-sm font-medium text-gray-700 mb-3">
              <ShieldCheck size={16} className="inline mr-2" />
              验证码（6位）
            </Text>
            <Input
              type="text"
              placeholder="请输入验证码"
              value={code}
              onInput={(e) => setCode(e.detail.value)}
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:border-yinban-primary focus:outline-none tracking-widest text-center"
            />
          </View>

          <Button
            className="w-full py-3 bg-yinban-primary text-white font-semibold rounded-2xl transition-opacity"
            disabled={loading}
            onClick={handleConfirmCode}
          >
            下一步
          </Button>

          <Button
            className="w-full mt-3 py-3 border-2 border-yinban-primary text-yinban-primary font-semibold rounded-2xl bg-transparent"
            onClick={() => setStep(1)}
          >
            重新输入手机号
          </Button>
        </View>
      )}

      {/* Step 3: Password Reset */}
      {step === 3 && (
        <View>
          <View className="mb-6">
            <Text className="block text-sm font-medium text-gray-700 mb-3">
              <Lock size={16} className="inline mr-2" />
              新密码
            </Text>
            <View className="flex items-center border-2 border-gray-300 rounded-2xl px-4 py-3 focus-within:border-yinban-primary">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入新密码（至少6位）"
                value={newPassword}
                onInput={(e) => setNewPassword(e.detail.value)}
                className="flex-1 border-0 outline-none"
              />
              <Button
                className="p-0 bg-transparent border-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Eye size={20} color="#666" />
                ) : (
                  <EyeClosed size={20} color="#666" />
                )}
              </Button>
            </View>
          </View>

          <View className="mb-6">
            <Text className="block text-sm font-medium text-gray-700 mb-3">
              <Lock size={16} className="inline mr-2" />
              确认密码
            </Text>
            <View className="flex items-center border-2 border-gray-300 rounded-2xl px-4 py-3 focus-within:border-yinban-primary">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="请再次输入密码"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
                className="flex-1 border-0 outline-none"
              />
              <Button
                className="p-0 bg-transparent border-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <Eye size={20} color="#666" />
                ) : (
                  <EyeClosed size={20} color="#666" />
                )}
              </Button>
            </View>
          </View>

          <Button
            className="w-full py-3 bg-yinban-primary text-white font-semibold rounded-2xl transition-opacity"
            disabled={loading}
            onClick={handleResetPassword}
          >
            确认重置
          </Button>
        </View>
      )}
    </View>
  )
}"""

tsx_path = os.path.join(dir_path, 'index.tsx')
with open(tsx_path, 'w', encoding='utf-8') as f:
    f.write(tsx_content)
print(f'✓ Created: index.tsx')

print('\n✓ All files created successfully!')
print(f'Location: {dir_path}')
