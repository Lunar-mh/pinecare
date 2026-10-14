#!/usr/bin/env python3
import os
import sys

# Define paths
dir_path = r'D:\03_Study\Desktop\old\frontend\src\pages\reset-password'

# Create directory
try:
    os.makedirs(dir_path, exist_ok=True)
    print(f'✓ Directory created: {dir_path}')
except Exception as e:
    print(f'✗ Failed to create directory: {e}')
    sys.exit(1)

# Create index.config.ts
config_content = """export default definePageConfig({
  navigationBarTitleText: '重置密码',
})
"""

try:
    with open(os.path.join(dir_path, 'index.config.ts'), 'w', encoding='utf-8') as f:
        f.write(config_content)
    print('✓ Created index.config.ts')
except Exception as e:
    print(f'✗ Failed to create index.config.ts: {e}')
    sys.exit(1)

# Create index.tsx - 3-step password reset component
component_content = """import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { sendSmsCode, verifyCode, resetPassword } from '@/services/modules/user'

type Step = 'phone' | 'code' | 'password'

interface ResetPasswordState {
  phone: string
  code: string
  password: string
  confirmPassword: string
  loading: boolean
  error: string
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('phone')
  const [state, setState] = useState<ResetPasswordState>({
    phone: '',
    code: '',
    password: '',
    confirmPassword: '',
    loading: false,
    error: '',
  })
  const [countdown, setCountdown] = useState(0)

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // Validate phone number
  const isPhoneValid = (p: string) => {
    return /^1\\d{10}$/.test(p)
  }

  // Validate password
  const isPasswordValid = (p: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/.test(p)
  }

  // Step 1: Send SMS code
  const handleSendSmsCode = async () => {
    setState(prev => ({ ...prev, error: '' }))
    if (!isPhoneValid(state.phone)) {
      setState(prev => ({ ...prev, error: '请输入11位有效的手机号' }))
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true }))
      await sendSmsCode(state.phone)
      setCountdown(60)
      setCurrentStep('code')
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err?.message || '发送验证码失败',
      }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // Step 2: Verify SMS code
  const handleVerifySmsCode = async () => {
    setState(prev => ({ ...prev, error: '' }))
    if (state.code.length !== 6) {
      setState(prev => ({ ...prev, error: '请输入6位验证码' }))
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true }))
      await verifyCode(state.phone, state.code)
      setCurrentStep('password')
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err?.message || '验证码验证失败',
      }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // Step 3: Reset password
  const handleResetPassword = async () => {
    setState(prev => ({ ...prev, error: '' }))
    if (!isPasswordValid(state.password)) {
      setState(prev => ({
        ...prev,
        error: '密码需要8位以上，包含大小写字母和数字',
      }))
      return
    }
    if (state.password !== state.confirmPassword) {
      setState(prev => ({ ...prev, error: '两次输入的密码不一致' }))
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true }))
      await resetPassword({
        phone: state.phone,
        code: state.code,
        password: state.password,
      })
      // Success - redirect to login
      router.push('/login')
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err?.message || '重置密码失败',
      }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const goBack = () => {
    if (currentStep === 'code') {
      setCurrentStep('phone')
      setState(prev => ({ ...prev, code: '', error: '' }))
    } else if (currentStep === 'password') {
      setCurrentStep('code')
      setState(prev => ({ ...prev, password: '', confirmPassword: '', error: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">重置密码</h1>
            <p className="text-gray-500 text-sm">
              {currentStep === 'phone' && '步骤 1/3 - 输入手机号'}
              {currentStep === 'code' && '步骤 2/3 - 验证码验证'}
              {currentStep === 'password' && '步骤 3/3 - 设置新密码'}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
              currentStep === 'phone' || currentStep === 'code' || currentStep === 'password'
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 transition-all ${
              currentStep === 'code' || currentStep === 'password'
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
              currentStep === 'code' || currentStep === 'password'
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 transition-all ${
              currentStep === 'password' ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
              currentStep === 'password' ? 'bg-blue-500' : 'bg-gray-300'
            }`}>
              3
            </div>
          </div>

          {/* Error Message */}
          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{state.error}</p>
            </div>
          )}

          {/* Step 1: Phone Input */}
          {currentStep === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  手机号码
                </label>
                <input
                  type="tel"
                  value={state.phone}
                  onChange={(e) =>
                    setState(prev => ({
                      ...prev,
                      phone: e.target.value.replace(/\\D/g, '').slice(0, 11),
                    }))
                  }
                  placeholder="请输入11位手机号"
                  maxLength={11}
                  disabled={state.loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <button
                onClick={handleSendSmsCode}
                disabled={state.loading || !isPhoneValid(state.phone) || countdown > 0}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                  countdown > 0 || state.loading || !isPhoneValid(state.phone)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
                }`}
              >
                {countdown > 0
                  ? \`\${countdown}秒后重试\`
                  : state.loading
                  ? '发送中...'
                  : '获取验证码'}
              </button>
            </div>
          )}

          {/* Step 2: Code Verification */}
          {currentStep === 'code' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  验证码
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  验证码已发送至 {state.phone}
                </p>
                <input
                  type="text"
                  value={state.code}
                  onChange={(e) =>
                    setState(prev => ({
                      ...prev,
                      code: e.target.value.replace(/\\D/g, '').slice(0, 6),
                    }))
                  }
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  disabled={state.loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <button
                onClick={handleVerifySmsCode}
                disabled={state.loading || state.code.length !== 6}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                  state.loading || state.code.length !== 6
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
                }`}
              >
                {state.loading ? '验证中...' : '下一步'}
              </button>
              <button
                onClick={goBack}
                disabled={state.loading}
                className="w-full py-2 px-4 text-blue-500 hover:text-blue-600 font-medium transition-all disabled:text-gray-400"
              >
                返回上一步
              </button>
            </div>
          )}

          {/* Step 3: Password Reset */}
          {currentStep === 'password' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新密码
                </label>
                <input
                  type="password"
                  value={state.password}
                  onChange={(e) =>
                    setState(prev => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="请输入8位以上密码，包含大小写字母和数字"
                  disabled={state.loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {state.password && (
                  <p className={`text-xs mt-1 ${
                    isPasswordValid(state.password)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {isPasswordValid(state.password)
                      ? '✓ 密码满足要求'
                      : '✗ 需要8位以上，包含大小写字母和数字'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={state.confirmPassword}
                  onChange={(e) =>
                    setState(prev => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="请再次输入密码"
                  disabled={state.loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {state.confirmPassword && (
                  <p className={`text-xs mt-1 ${
                    state.password === state.confirmPassword
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {state.password === state.confirmPassword
                      ? '✓ 密码一致'
                      : '✗ 密码不一致'}
                  </p>
                )}
              </div>

              <button
                onClick={handleResetPassword}
                disabled={
                  state.loading ||
                  !isPasswordValid(state.password) ||
                  state.password !== state.confirmPassword
                }
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                  state.loading ||
                  !isPasswordValid(state.password) ||
                  state.password !== state.confirmPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
                }`}
              >
                {state.loading ? '重置中...' : '完成重置'}
              </button>

              <button
                onClick={goBack}
                disabled={state.loading}
                className="w-full py-2 px-4 text-blue-500 hover:text-blue-600 font-medium transition-all disabled:text-gray-400"
              >
                返回上一步
              </button>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <p className="text-center text-gray-500 text-xs mt-6">
          需要帮助？<a href="#" className="text-blue-500 hover:text-blue-600">联系客服</a>
        </p>
      </div>
    </div>
  )
}
"""

try:
    with open(os.path.join(dir_path, 'index.tsx'), 'w', encoding='utf-8') as f:
        f.write(component_content)
    print('✓ Created index.tsx')
except Exception as e:
    print(f'✗ Failed to create index.tsx: {e}')
    sys.exit(1)

print('\\n✓ All files created successfully!')
print(f'Location: {dir_path}')
print('Files: index.config.ts, index.tsx')
