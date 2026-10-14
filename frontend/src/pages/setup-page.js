const fs = require('fs');
const path = require('path');

const pagesDir = 'D:\\03_Study\\Desktop\\old\\frontend\\src\\pages';
const resetPasswordDir = path.join(pagesDir, 'reset-password');

// Create directory
if (!fs.existsSync(resetPasswordDir)) {
  fs.mkdirSync(resetPasswordDir, { recursive: true });
  console.log(`✓ Created directory: ${resetPasswordDir}`);
}

// Create index.config.ts
const configContent = `export default definePageConfig({
  navigationBarTitleText: '重置密码',
  navigationBarBackgroundColor: '#01579b',
  navigationBarTextStyle: 'white',
})`;

fs.writeFileSync(path.join(resetPasswordDir, 'index.config.ts'), configContent);
console.log('✓ Created file: index.config.ts');

// Create index.tsx
const indexContent = `import { useState, useCallback, useEffect } from 'react'
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

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Phone validation: 11 digits starting with 1
  const isPhoneValid = useCallback((phoneNum: string) => {
    return /^1[3-9]\\d{9}$/.test(phoneNum)
  }, [])

  // Password validation: 8+ chars with uppercase, lowercase, digit
  const isPasswordValid = useCallback((pwd: string) => {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\\d/.test(pwd)
  }, [])

  // Step 1: Send verification code
  const handleSendCode = useCallback(async () => {
    if (countdown > 0) return
    if (!isPhoneValid(phone)) {
      Taro.showToast({ title: '请输入有效的手机号码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset({ phone })
      Taro.showToast({ title: '验证码已发送', icon: 'success' })
      setCountdown(60)
      setStep(2)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '发送失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, countdown, isPhoneValid])

  // Step 2: Verify code
  const handleVerifyCode = useCallback(async () => {
    if (code.length !== 6) {
      Taro.showToast({ title: '请输入6位验证码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset({ phone, code, step: 'verify' })
      Taro.showToast({ title: '验证成功', icon: 'success' })
      setStep(3)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '验证失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, code])

  // Step 3: Reset password
  const handleResetPassword = useCallback(async () => {
    if (!isPasswordValid(newPassword)) {
      Taro.showToast({ title: '密码至少8位，包含大小写字母和数字', icon: 'none' })
      return
    }
    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次输入的密码不一致', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset({ phone, code, newPassword, step: 'reset' })
      Taro.showToast({ title: '密码重置成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '重置失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, code, newPassword, confirmPassword, isPasswordValid])

  return (
    <View className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <View className="pt-16 px-8 pb-10 flex flex-col items-center">
        <View className="w-20 h-20 bg-yinban-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Icon name="lock" size={48} color="#10B981" />
        </View>
        <Text className="text-dash-hero font-bold text-dash-text-main mb-3">重置密码</Text>
        <Text className="text-dash-body text-dash-text-sub text-center">
          {step === 1 && '请输入注册手机号'}
          {step === 2 && '请输入验证码'}
          {step === 3 && '请设置新密码'}
        </Text>
      </View>

      {/* Form Content */}
      <View className="px-8 flex-1">
        {/* Step 1: Phone Input */}
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
                onInput={(e) => setPhone(e.detail.value.replace(/\\D/g, '').slice(0, 11))}
              />
            </View>

            <View
              className={`h-14 rounded-full flex items-center justify-center transition-all \${
                loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'
              }`}
              onClick={loading ? undefined : handleSendCode}
            >
              <Text className="text-white text-dash-title font-bold">
                {countdown > 0 ? \`\${countdown}s 后重新获取\` : '发送验证码'}
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: Code Input */}
        {step === 2 && (
          <View className="space-y-6">
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="shield-check" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type="number"
                maxlength={6}
                value={code}
                placeholder="请输入验证码"
                placeholderTextColor="#94A3B8"
                onInput={(e) => setCode(e.detail.value.replace(/\\D/g, '').slice(0, 6))}
              />
            </View>

            <View
              className={`h-14 rounded-full flex items-center justify-center transition-all \${
                loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'
              }`}
              onClick={loading ? undefined : handleVerifyCode}
            >
              <Text className="text-white text-dash-title font-bold">
                {loading ? '验证中...' : '下一步'}
              </Text>
            </View>

            <View className="flex justify-center">
              <Text
                className="text-dash-tiny text-yinban-primary active:opacity-50"
                onClick={() => setStep(1)}
              >
                返回修改手机号
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Password Input */}
        {step === 3 && (
          <View className="space-y-6">
            {/* New Password */}
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="lock" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                password={!showPassword}
                value={newPassword}
                placeholder="请输入新密码"
                placeholderTextColor="#94A3B8"
                onInput={(e) => setNewPassword(e.detail.value)}
              />
              <View onClick={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" />
              </View>
            </View>

            {/* Confirm Password */}
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="lock" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                password={!showConfirmPassword}
                value={confirmPassword}
                placeholder="请确认密码"
                placeholderTextColor="#94A3B8"
                onInput={(e) => setConfirmPassword(e.detail.value)}
              />
              <View onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" />
              </View>
            </View>

            {/* Password Requirements */}
            <View className="bg-yinban-bg/50 p-4 rounded-2xl space-y-2">
              <Text className="text-dash-tiny text-dash-text-sub">密码要求:</Text>
              <Text className={`text-dash-tiny \${newPassword.length >= 8 ? 'text-green-500' : 'text-dash-text-sub'}`}>
                ✓ 至少8个字符
              </Text>
              <Text className={`text-dash-tiny \${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-dash-text-sub'}`}>
                ✓ 包含大写字母
              </Text>
              <Text className={`text-dash-tiny \${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-dash-text-sub'}`}>
                ✓ 包含小写字母
              </Text>
              <Text className={`text-dash-tiny \${/\\d/.test(newPassword) ? 'text-green-500' : 'text-dash-text-sub'}`}>
                ✓ 包含数字
              </Text>
            </View>

            <View
              className={`h-14 rounded-full flex items-center justify-center transition-all mt-8 \${
                loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'
              }`}
              onClick={loading ? undefined : handleResetPassword}
            >
              <Text className="text-white text-dash-title font-bold">
                {loading ? '重置中...' : '完成重置'}
              </Text>
            </View>

            <View className="flex justify-center">
              <Text
                className="text-dash-tiny text-yinban-primary active:opacity-50"
                onClick={() => setStep(2)}
              >
                返回验证
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}`;

fs.writeFileSync(path.join(resetPasswordDir, 'index.tsx'), indexContent);
console.log('✓ Created file: index.tsx');

console.log('\\n✅ All files have been created successfully!');
