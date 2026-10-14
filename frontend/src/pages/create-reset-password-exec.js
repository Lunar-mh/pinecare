const fs = require('fs');
const path = require('path');

const dirPath = 'D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\reset-password';

// Create directory
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`✓ Created directory: ${dirPath}`);
} else {
  console.log(`Directory already exists: ${dirPath}`);
}

// Create index.config.ts
const configContent = `export default definePageConfig({
  navigationBarTitleText: '重置密码',
})`;

fs.writeFileSync(path.join(dirPath, 'index.config.ts'), configContent);
console.log('✓ Created index.config.ts');

// Create index.tsx
const componentContent = `import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button } from '@tarojs/components'
import { Eye, EyeClosed, ArrowLeft, Lock, Phone, ShieldCheck } from '@nutui/icons-react-taro'
import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'

type ResetStep = 'phone' | 'code' | 'password'

export default function ResetPassword() {
  const [currentStep, setCurrentStep] = useState<ResetStep>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // SMS Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Step 1: Request Password Reset (Send SMS)
  const handleRequestReset = async () => {
    if (!phone.trim()) {
      setError('请输入手机号')
      return
    }
    
    setLoading(true)
    setError('')
    try {
      await requestPasswordReset({ phone })
      setCountdown(60)
      setCurrentStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Confirm Code and Move to Password Reset
  const handleConfirmCode = async () => {
    if (!code.trim()) {
      setError('请输入验证码')
      return
    }
    
    setCurrentStep('password')
    setError('')
  }

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!password.trim()) {
      setError('请输入新密码')
      return
    }
    
    if (password !== confirmPassword) {
      setError('两次输入密码不一致')
      return
    }
    
    if (password.length < 6) {
      setError('密码长度至少为6个字符')
      return
    }

    setLoading(true)
    setError('')
    try {
      await confirmPasswordReset({
        phone,
        code,
        password,
      })
      
      Taro.showToast({
        title: '重置成功',
        icon: 'success',
        duration: 2000,
      })
      
      setTimeout(() => {
        Taro.navigateBack()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    if (currentStep === 'phone') {
      Taro.navigateBack()
    } else {
      setCurrentStep('phone')
      setCode('')
      setPassword('')
      setConfirmPassword('')
      setError('')
    }
  }

  return (
    <View className="bg-yinban-bg min-h-screen p-4">
      {/* Header */}
      <View className="flex items-center justify-between mb-6">
        <View onClick={handleGoBack} className="cursor-pointer">
          <ArrowLeft size={24} className="text-yinban-primary" />
        </View>
        <Text className="text-lg font-semibold text-yinban-primary">
          {currentStep === 'phone' && '输入手机号'}
          {currentStep === 'code' && '输入验证码'}
          {currentStep === 'password' && '设置新密码'}
        </Text>
        <View style={{ width: '24px' }} />
      </View>

      {/* Step 1: Phone Input */}
      {currentStep === 'phone' && (
        <View>
          <View className="mb-4">
            <View className="flex items-center bg-white rounded-2xl px-4 py-3 mb-4">
              <Phone size={20} className="text-yinban-primary mr-2" />
              <Input
                type="number"
                placeholder="请输入手机号"
                value={phone}
                onInput={(e) => setPhone(e.detail.value)}
                className="flex-1 outline-none"
              />
            </View>
          </View>

          {error && (
            <Text className="text-red-500 text-sm mb-4">{error}</Text>
          )}

          <Button
            onClick={handleRequestReset}
            disabled={loading || !phone.trim()}
            className="w-full bg-yinban-primary text-white py-3 rounded-2xl font-semibold"
            loading={loading}
          >
            {loading ? '发送中...' : '发送验证码'}
          </Button>
        </View>
      )}

      {/* Step 2: Code Input */}
      {currentStep === 'code' && (
        <View>
          <View className="mb-4">
            <View className="flex items-center bg-white rounded-2xl px-4 py-3 mb-4">
              <ShieldCheck size={20} className="text-yinban-primary mr-2" />
              <Input
                type="number"
                placeholder="请输入验证码"
                value={code}
                onInput={(e) => setCode(e.detail.value)}
                className="flex-1 outline-none"
                maxLength={6}
              />
            </View>

            <View className="text-center text-sm text-gray-500">
              {countdown > 0 ? (
                <Text>重新发送验证码 ({countdown}s)</Text>
              ) : (
                <Text
                  onClick={() => setCurrentStep('phone')}
                  className="text-yinban-primary cursor-pointer"
                >
                  重新发送验证码
                </Text>
              )}
            </View>
          </View>

          {error && (
            <Text className="text-red-500 text-sm mb-4">{error}</Text>
          )}

          <Button
            onClick={handleConfirmCode}
            disabled={!code.trim()}
            className="w-full bg-yinban-primary text-white py-3 rounded-2xl font-semibold mb-2"
          >
            下一步
          </Button>

          <Button
            onClick={() => setCurrentStep('phone')}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold"
          >
            返回修改
          </Button>
        </View>
      )}

      {/* Step 3: Password Reset */}
      {currentStep === 'password' && (
        <View>
          <View className="mb-4">
            {/* New Password */}
            <View className="flex items-center bg-white rounded-2xl px-4 py-3 mb-4">
              <Lock size={20} className="text-yinban-primary mr-2" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入新密码"
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
                className="flex-1 outline-none"
              />
              <View
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer ml-2"
              >
                {showPassword ? (
                  <EyeClosed size={20} className="text-gray-400" />
                ) : (
                  <Eye size={20} className="text-gray-400" />
                )}
              </View>
            </View>

            {/* Confirm Password */}
            <View className="flex items-center bg-white rounded-2xl px-4 py-3 mb-4">
              <Lock size={20} className="text-yinban-primary mr-2" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="请确认新密码"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
                className="flex-1 outline-none"
              />
              <View
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="cursor-pointer ml-2"
              >
                {showConfirmPassword ? (
                  <EyeClosed size={20} className="text-gray-400" />
                ) : (
                  <Eye size={20} className="text-gray-400" />
                )}
              </View>
            </View>
          </View>

          {error && (
            <Text className="text-red-500 text-sm mb-4">{error}</Text>
          )}

          <Button
            onClick={handleResetPassword}
            disabled={loading || !password.trim() || !confirmPassword.trim()}
            className="w-full bg-yinban-primary text-white py-3 rounded-2xl font-semibold mb-2"
            loading={loading}
          >
            {loading ? '重置中...' : '确认重置'}
          </Button>

          <Button
            onClick={() => setCurrentStep('code')}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold"
          >
            返回修改
          </Button>
        </View>
      )}
    </View>
  )
}`;

fs.writeFileSync(path.join(dirPath, 'index.tsx'), componentContent);
console.log('✓ Created index.tsx');

console.log('\n✓ All files created successfully!');
