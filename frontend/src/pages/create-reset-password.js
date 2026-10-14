const fs = require('fs');
const path = require('path');

const resetPasswordDir = path.join(__dirname, 'reset-password');
if (!fs.existsSync(resetPasswordDir)) {
  fs.mkdirSync(resetPasswordDir, { recursive: true });
  console.log('Created reset-password directory');
}

// Create index.config.ts
const configContent = `export default definePageConfig({
  navigationBarTitleText: '重置密码',
})`;

fs.writeFileSync(path.join(resetPasswordDir, 'index.config.ts'), configContent);
console.log('Created index.config.ts');

// Create index.tsx
const indexContent = `import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { sendSmsCode, resetPassword } from '@/services/modules/user'
import { EyeIcon, EyeOffIcon, CheckIcon } from '@/components/icons'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

  // Handle sending SMS code
  const handleSendSmsCode = async () => {
    setError('')
    if (!isPhoneValid(phone)) {
      setError('请输入11位有效的手机号')
      return
    }

    try {
      setLoading(true)
      await sendSmsCode(phone)
      setCountdown(60)
      setStep(2)
    } catch (err: any) {
      setError(err?.message || '发送验证码失败')
    } finally {
      setLoading(false)
    }
  }

  // Handle moving to password step
  const handleVerifySmsCode = () => {
    setError('')
    if (smsCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }
    setStep(3)
  }

  // Handle password reset
  const handleResetPassword = async () => {
    setError('')
    if (!isPasswordValid(newPassword)) {
      setError('密码需要8位以上，包含大小写字母和数字')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    try {
      setLoading(true)
      await resetPassword({
        phone,
        smsCode,
        newPassword,
      })
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err?.message || '重置密码失败')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Phone input
  if (step === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-yinban-primary rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">重置密码</h1>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入11位手机号"
                  maxLength={11}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleSendSmsCode}
                disabled={loading || countdown > 0}
                className={\`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors \${
                  countdown > 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }\`}
              >
                {countdown > 0 ? \`\${countdown}秒后重试\` : '获取验证码'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: SMS code input
  if (step === 2) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-yinban-primary rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">验证码</h1>
            <p className="text-center text-gray-600 text-sm mb-8">
              验证码已发送至 {phone}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  验证码
                </label>
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleVerifySmsCode}
                disabled={smsCode.length !== 6}
                className={\`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors \${
                  smsCode.length !== 6
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }\`}
              >
                下一步
              </button>

              <button
                onClick={() => {
                  setStep(1)
                  setPhone('')
                  setSmsCode('')
                  setError('')
                }}
                className="w-full py-2 px-4 text-blue-500 hover:text-blue-600 font-medium transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Password reset
  if (step === 3) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-yinban-primary rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">设置新密码</h1>

            <div className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入8位以上密码，包含大小写字母和数字"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {newPassword && (
                  <p className={\`text-xs mt-1 \${isPasswordValid(newPassword) ? 'text-green-500' : 'text-red-500'}\`}>
                    {isPasswordValid(newPassword)
                      ? '✓ 密码满足要求'
                      : '✗ 需要8位以上，包含大小写字母和数字'}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={\`text-xs mt-1 \${newPassword === confirmPassword ? 'text-green-500' : 'text-red-500'}\`}>
                    {newPassword === confirmPassword ? '✓ 密码一致' : '✗ 密码不一致'}
                  </p>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                  <p className="text-green-800">密码重置成功，正在跳转到登录页...</p>
                </div>
              )}

              <button
                onClick={handleResetPassword}
                disabled={
                  loading ||
                  !isPasswordValid(newPassword) ||
                  newPassword !== confirmPassword ||
                  success
                }
                className={\`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors \${
                  loading || !isPasswordValid(newPassword) || newPassword !== confirmPassword || success
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }\`}
              >
                {loading ? '重置中...' : '重置密码'}
              </button>

              <button
                onClick={() => {
                  setStep(2)
                  setNewPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                className="w-full py-2 px-4 text-blue-500 hover:text-blue-600 font-medium transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}`;

fs.writeFileSync(path.join(resetPasswordDir, 'index.tsx'), indexContent);
console.log('Created index.tsx');
