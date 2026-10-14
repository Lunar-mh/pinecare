const fs = require('fs');
const path = require('path');

// Use fixed path with Windows backslashes
const dir = 'D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\reset-password';

console.log('Creating directory: ' + dir);

// Create directory
try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  console.log('✓ Directory created successfully');
} catch (e) {
  console.error('✗ Failed to create directory:', e.message);
  process.exit(1);
}

// index.config.ts content
const configContent = `export default definePageConfig({
  navigationBarTitleText: '重置密码',
})
`;

// Write index.config.ts
try {
  fs.writeFileSync(path.join(dir, 'index.config.ts'), configContent, 'utf8');
  console.log('✓ Created index.config.ts');
} catch (e) {
  console.error('✗ Failed to create index.config.ts:', e.message);
  process.exit(1);
}

// index.tsx content - 3-step password reset component for Taro
const tsxContent = `import { useState, useEffect, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button } from '@tarojs/components'
import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'

type Step = 1 | 2 | 3

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const isPhoneValid = (val: string) => /^1[3-9]\\d{9}$/.test(val)

  // Step 1: Send SMS code
  const handleSendCode = useCallback(async () => {
    if (!isPhoneValid(phone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await requestPasswordReset({ phone })
      Taro.showToast({ title: '验证码已发送', icon: 'success' })
      setCountdown(60)
      setStep(2)
    } catch (e) {
      Taro.showToast({ title: '发送失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone])

  // Step 2: Verify code
  const handleVerifyCode = useCallback(() => {
    if (code.length !== 6) {
      Taro.showToast({ title: '请输入6位验证码', icon: 'none' })
      return
    }
    setStep(3)
  }, [code])

  // Step 3: Reset password
  const handleResetPassword = useCallback(async () => {
    if (newPassword.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次密码输入不一致', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await confirmPasswordReset({ phone, code, newPassword })
      Taro.showToast({ title: '密码重置成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (e) {
      Taro.showToast({ title: '重置失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, code, newPassword, confirmPassword])

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step)
    } else {
      Taro.navigateBack()
    }
  }

  return (
    <View className="min-h-screen bg-yinban-bg px-6 py-8">
      {/* Header */}
      <View className="flex items-center mb-8">
        <View 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95"
          onClick={handleBack}
        >
          <Text className="text-xl">←</Text>
        </View>
        <Text className="text-xl font-bold text-gray-800 ml-4">重置密码</Text>
      </View>

      {/* Progress */}
      <View className="flex justify-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            className={\`h-2 w-12 rounded-full transition-all \${
              s <= step ? 'bg-yinban-primary' : 'bg-gray-200'
            }\`}
          />
        ))}
      </View>

      {/* Step 1: Phone */}
      {step === 1 && (
        <View className="bg-white rounded-3xl p-6 shadow-card">
          <Text className="text-lg font-bold text-gray-800 mb-6 block">验证手机号</Text>
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-2 block">手机号码</Text>
            <Input
              type="number"
              placeholder="请输入手机号"
              value={phone}
              onInput={(e) => setPhone(e.detail.value)}
              maxlength={11}
              className="w-full h-14 px-4 bg-yinban-bg rounded-2xl text-base"
            />
          </View>
          <Button
            className={\`w-full h-14 rounded-2xl text-base font-bold border-none \${
              loading || countdown > 0 
                ? 'bg-gray-300 text-gray-500' 
                : 'bg-yinban-primary text-white'
            }\`}
            disabled={loading || countdown > 0}
            onClick={handleSendCode}
          >
            {countdown > 0 ? \`重新发送(\${countdown}s)\` : loading ? '发送中...' : '发送验证码'}
          </Button>
        </View>
      )}

      {/* Step 2: Code */}
      {step === 2 && (
        <View className="bg-white rounded-3xl p-6 shadow-card">
          <Text className="text-lg font-bold text-gray-800 mb-2 block">输入验证码</Text>
          <Text className="text-sm text-gray-500 mb-6 block">验证码已发送至 {phone}</Text>
          <View className="mb-4">
            <Input
              type="number"
              placeholder="请输入6位验证码"
              value={code}
              onInput={(e) => setCode(e.detail.value)}
              maxlength={6}
              className="w-full h-14 px-4 bg-yinban-bg rounded-2xl text-base text-center tracking-widest"
            />
          </View>
          <View className="flex gap-3">
            <Button
              className="flex-1 h-14 rounded-2xl text-base font-bold border-2 border-gray-200 bg-white text-gray-700"
              onClick={() => setStep(1)}
            >
              上一步
            </Button>
            <Button
              className="flex-1 h-14 rounded-2xl text-base font-bold border-none bg-yinban-primary text-white"
              onClick={handleVerifyCode}
            >
              下一步
            </Button>
          </View>
          {countdown > 0 && (
            <Text className="text-center text-sm text-gray-400 mt-4 block">
              {countdown}秒后可重新发送
            </Text>
          )}
        </View>
      )}

      {/* Step 3: Password */}
      {step === 3 && (
        <View className="bg-white rounded-3xl p-6 shadow-card">
          <Text className="text-lg font-bold text-gray-800 mb-6 block">设置新密码</Text>
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-2 block">新密码</Text>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入新密码（至少6位）"
              value={newPassword}
              onInput={(e) => setNewPassword(e.detail.value)}
              className="w-full h-14 px-4 bg-yinban-bg rounded-2xl text-base"
            />
          </View>
          <View className="mb-6">
            <Text className="text-sm text-gray-500 mb-2 block">确认密码</Text>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="请再次输入密码"
              value={confirmPassword}
              onInput={(e) => setConfirmPassword(e.detail.value)}
              className="w-full h-14 px-4 bg-yinban-bg rounded-2xl text-base"
            />
          </View>
          <View 
            className="flex items-center mb-6"
            onClick={() => setShowPassword(!showPassword)}
          >
            <View className={\`w-5 h-5 rounded border-2 mr-2 flex items-center justify-center \${
              showPassword ? 'bg-yinban-primary border-yinban-primary' : 'border-gray-300'
            }\`}>
              {showPassword && <Text className="text-white text-xs">✓</Text>}
            </View>
            <Text className="text-sm text-gray-600">显示密码</Text>
          </View>
          <View className="flex gap-3">
            <Button
              className="flex-1 h-14 rounded-2xl text-base font-bold border-2 border-gray-200 bg-white text-gray-700"
              onClick={() => setStep(2)}
            >
              上一步
            </Button>
            <Button
              className={\`flex-1 h-14 rounded-2xl text-base font-bold border-none \${
                loading ? 'bg-gray-300 text-gray-500' : 'bg-yinban-primary text-white'
              }\`}
              disabled={loading}
              onClick={handleResetPassword}
            >
              {loading ? '重置中...' : '确认重置'}
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
`;

// Write index.tsx
try {
  fs.writeFileSync(path.join(dir, 'index.tsx'), tsxContent, 'utf8');
  console.log('✓ Created index.tsx');
} catch (e) {
  console.error('✗ Failed to create index.tsx:', e.message);
  process.exit(1);
}

console.log('\\n✅ Reset password page created successfully!');
console.log('Files created:');
console.log('  - ' + path.join(dir, 'index.config.ts'));
console.log('  - ' + path.join(dir, 'index.tsx'));
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
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // Validate phone number (11 digits starting with 1)
  const isPhoneValid = (p) => {
    return /^1\\d{10}$/.test(p)
  }

  // Validate password (8+ chars, uppercase, lowercase, digit)
  const isPasswordValid = (p) => {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all \${
              currentStep !== 'phone'
                ? 'bg-blue-500'
                : 'bg-blue-500'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 transition-all \${
              currentStep === 'code' || currentStep === 'password'
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all \${
              currentStep === 'code' || currentStep === 'password'
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 transition-all \${
              currentStep === 'password' ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all \${
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
                className={\`w-full py-3 px-4 rounded-lg font-medium text-white transition-all \${
                  countdown > 0 || state.loading || !isPhoneValid(state.phone)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
                }\`}
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
                className={\`w-full py-3 px-4 rounded-lg font-medium text-white transition-all \${
                  state.loading || state.code.length !== 6
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
                }\`}
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
                  <p className={\`text-xs mt-1 \${
                    isPasswordValid(state.password)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }\`}>
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
                  <p className={\`text-xs mt-1 \${
                    state.password === state.confirmPassword
                      ? 'text-green-600'
                      : 'text-red-600'
                  }\`}>
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
                className={\`w-full py-3 px-4 rounded-lg font-medium text-white transition-all \${
                  state.loading ||
                  !isPasswordValid(state.password) ||
                  state.password !== state.confirmPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
                }\`}
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
}`;

// Write index.tsx
try {
  fs.writeFileSync(path.join(dir, 'index.tsx'), tsxContent, 'utf8');
  console.log('✓ Created index.tsx');
} catch (e) {
  console.error('✗ Failed to create index.tsx:', e.message);
  process.exit(1);
}

console.log('\n✓ All files created successfully!');
console.log('Location: ' + dir);
console.log('Files:');
console.log('  - index.config.ts');
console.log('  - index.tsx (3-step password reset component)');
console.log('\nThe reset-password module is ready for use!');
