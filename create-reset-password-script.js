#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function createFiles() {
  const baseDir = path.join('D:', '03_Study', 'Desktop', 'old', 'frontend', 'src', 'pages', 'reset-password');
  
  try {
    // Create directory
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`✓ Created directory: ${baseDir}`);
    } else {
      console.log(`✓ Directory already exists: ${baseDir}`);
    }

    // Create index.config.ts
    const configContent = `export default definePageConfig({
  navigationBarTitleText: '重置密码',
})
`;
    fs.writeFileSync(path.join(baseDir, 'index.config.ts'), configContent, 'utf-8');
    console.log(`✓ Created file: index.config.ts`);

    // Create index.tsx
    const componentContent = `import { useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'
import { Icon } from '@/components/icons'

type Step = 'phone' | 'code' | 'password'

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  const isPhoneValid = (val: string) => /^1[3-9]\\d{9}$/.test(val)

  const isPasswordValid = (val: string) => {
    if (val.length < 8) return false
    const hasUpper = /[A-Z]/.test(val)
    const hasLower = /[a-z]/.test(val)
    const hasDigit = /\\d/.test(val)
    return hasUpper && hasLower && hasDigit
  }

  const handleSendCode = useCallback(async () => {
    if (countdown > 0) return
    if (!isPhoneValid(phone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset(phone)
      Taro.showToast({ title: '验证码已发送', icon: 'success' })
      setStep('code')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      const err = error as { message?: string }
      Taro.showToast({ title: err.message || '验证码发送失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, countdown])

  const handleVerifyCode = useCallback(() => {
    if (code.length !== 6) {
      Taro.showToast({ title: '请输入 6 位验证码', icon: 'none' })
      return
    }
    setStep('password')
  }, [code])

  const handleResetPassword = useCallback(async () => {
    if (!isPasswordValid(password)) {
      Taro.showToast({ title: '密码需8位以上，含大小写字母和数字', icon: 'none' })
      return
    }
    if (password !== confirmPwd) {
      Taro.showToast({ title: '两次输入的密码不一致', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset(phone, code, password)
      Taro.showToast({ title: '密码重置成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      const err = error as { message?: string }
      Taro.showToast({ title: err.message || '密码重置失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, code, password, confirmPwd])

  const renderStepIndicator = () => (
    <View className="flex items-center justify-center mb-8">
      <View className={\`w-8 h-8 rounded-full flex items-center justify-center \${step === 'phone' ? 'bg-yinban-primary' : 'bg-yinban-primary'}\`}>
        <Text className="text-white text-dash-body font-bold">1</Text>
      </View>
      <View className={\`w-12 h-1 \${step !== 'phone' ? 'bg-yinban-primary' : 'bg-gray-200'}\`} />
      <View className={\`w-8 h-8 rounded-full flex items-center justify-center \${step === 'code' || step === 'password' ? 'bg-yinban-primary' : 'bg-gray-200'}\`}>
        <Text className={\`text-dash-body font-bold \${step === 'code' || step === 'password' ? 'text-white' : 'text-gray-400'}\`}>2</Text>
      </View>
      <View className={\`w-12 h-1 \${step === 'password' ? 'bg-yinban-primary' : 'bg-gray-200'}\`} />
      <View className={\`w-8 h-8 rounded-full flex items-center justify-center \${step === 'password' ? 'bg-yinban-primary' : 'bg-gray-200'}\`}>
        <Text className={\`text-dash-body font-bold \${step === 'password' ? 'text-white' : 'text-gray-400'}\`}>3</Text>
      </View>
    </View>
  )

  return (
    <View className="min-h-screen bg-white flex flex-col">
      {/* 顶部 Hero 区域 */}
      <View className="pt-16 px-8 pb-8 flex flex-col items-center">
        <View className="w-20 h-20 bg-yinban-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Icon name="lock" size={48} color="#10B981" />
        </View>
        <Text className="text-dash-hero font-bold text-dash-text-main mb-3">重置密码</Text>
        <Text className="text-dash-body text-dash-text-sub text-center">
          {step === 'phone' && '请输入您的手机号获取验证码'}
          {step === 'code' && '请输入收到的 6 位验证码'}
          {step === 'password' && '请设置新的登录密码'}
        </Text>
      </View>

      {/* 步骤指示器 */}
      {renderStepIndicator()}

      {/* 表单区域 */}
      <View className="px-8 flex-1">
        {step === 'phone' && (
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
              className={\`h-14 rounded-full flex items-center justify-center transition-all mt-8 \${loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'}\`}
              onClick={loading ? undefined : handleSendCode}
            >
              <Text className="text-white text-dash-title font-bold">{loading ? '发送中...' : '获取验证码'}</Text>
            </View>
          </View>
        )}

        {step === 'code' && (
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
              <View 
                className={\`px-4 h-8 rounded-full flex items-center justify-center \${countdown > 0 ? 'bg-gray-200' : 'bg-yinban-primary/10 active:opacity-50'}\`}
                onClick={countdown > 0 ? undefined : handleSendCode}
              >
                <Text className={\`text-dash-tiny font-medium \${countdown > 0 ? 'text-gray-500' : 'text-yinban-primary'}\`}>
                  {countdown > 0 ? \`\${countdown}s\` : '重新获取'}
                </Text>
              </View>
            </View>

            <View className="flex space-x-4 mt-8">
              <View 
                className="flex-1 h-14 rounded-full flex items-center justify-center border border-yinban-primary active:scale-[0.98]"
                onClick={() => setStep('phone')}
              >
                <Text className="text-yinban-primary text-dash-title font-bold">上一步</Text>
              </View>
              <View 
                className="flex-1 h-14 rounded-full flex items-center justify-center bg-yinban-primary active:scale-[0.98]"
                onClick={handleVerifyCode}
              >
                <Text className="text-white text-dash-title font-bold">下一步</Text>
              </View>
            </View>
          </View>
        )}

        {step === 'password' && (
          <View className="space-y-6">
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="lock" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type={showPassword ? 'text' : 'safe-password'}
                value={password}
                placeholder="请输入新密码"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setPassword(event.detail.value)}
              />
              <View onClick={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eye' : 'eye-off'} size={24} color="#64748B" />
              </View>
            </View>

            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="lock" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type={showConfirmPwd ? 'text' : 'safe-password'}
                value={confirmPwd}
                placeholder="请再次输入新密码"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setConfirmPwd(event.detail.value)}
              />
              <View onClick={() => setShowConfirmPwd(!showConfirmPwd)}>
                <Icon name={showConfirmPwd ? 'eye' : 'eye-off'} size={24} color="#64748B" />
              </View>
            </View>

            <View className="px-2">
              <Text className="text-dash-tiny text-dash-text-sub">
                密码要求：8位以上，包含大写字母、小写字母和数字
              </Text>
            </View>

            <View className="flex space-x-4 mt-8">
              <View 
                className="flex-1 h-14 rounded-full flex items-center justify-center border border-yinban-primary active:scale-[0.98]"
                onClick={() => setStep('code')}
              >
                <Text className="text-yinban-primary text-dash-title font-bold">上一步</Text>
              </View>
              <View 
                className={\`flex-1 h-14 rounded-full flex items-center justify-center transition-all \${loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'}\`}
                onClick={loading ? undefined : handleResetPassword}
              >
                <Text className="text-white text-dash-title font-bold">{loading ? '提交中...' : '确认重置'}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 底部返回登录 */}
      <View className="pb-10 flex justify-center items-center px-8">
        <Text 
          className="text-dash-body text-yinban-primary active:opacity-50"
          onClick={() => Taro.navigateBack()}
        >
          返回登录
        </Text>
      </View>
    </View>
  )
}
`;
    fs.writeFileSync(path.join(baseDir, 'index.tsx'), componentContent, 'utf-8');
    console.log(`✓ Created file: index.tsx`);

    console.log('\n✓ All files created successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  }
}

createFiles();
`;
