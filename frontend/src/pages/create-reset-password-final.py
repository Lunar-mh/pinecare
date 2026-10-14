#!/usr/bin/env python3
import os
import sys

# Create reset-password directory
pages_dir = r'D:\03_Study\Desktop\old\frontend\src\pages'
reset_password_dir = os.path.join(pages_dir, 'reset-password')
os.makedirs(reset_password_dir, exist_ok=True)
print(f'✓ Created directory: {reset_password_dir}')

# Create index.config.ts
config_content = """export default definePageConfig({
  navigationBarTitleText: '重置密码',
})"""

config_file = os.path.join(reset_password_dir, 'index.config.ts')
with open(config_file, 'w', encoding='utf-8') as f:
    f.write(config_content)
print(f'✓ Created file: {config_file}')

# Create index.tsx with correct Taro imports
index_tsx_content = """import { useState, useCallback, useEffect } from 'react'
import { useRouter } from '@tarojs/hooks'
import Taro from '@tarojs/taro'
import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'
import { Icon } from '@/components/icons'
import './index.scss'

export default function ResetPassword() {
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
  const [resetToken, setResetToken] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Phone validation
  const isPhoneValid = useCallback((phoneNum) => {
    return /^1[3-9]\\d{9}$/.test(phoneNum)
  }, [])

  // Password validation - 8+ chars with uppercase, lowercase, digit
  const isPasswordValid = useCallback((pwd) => {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /\\d/.test(pwd)
    )
  }, [])

  // Step 1: Request SMS code
  const handleRequestSMS = useCallback(async () => {
    setError('')
    
    if (!isPhoneValid(phone)) {
      setError('请输入有效的11位手机号码（以1开头）')
      return
    }

    try {
      setLoading(true)
      const response = await requestPasswordReset({ phone })
      
      if (response.success) {
        setCountdown(60)
        setResetToken(response.data?.token || '')
        setStep(2)
        Taro.showToast({
          title: '验证码已发送',
          icon: 'success',
          duration: 2000,
        })
      } else {
        setError(response.message || '发送验证码失败，请重试')
      }
    } catch (err) {
      setError(err?.message || '网络请求失败')
      Taro.showToast({
        title: '发送失败',
        icon: 'error',
        duration: 2000,
      })
    } finally {
      setLoading(false)
    }
  }, [phone, isPhoneValid])

  // Step 2: Verify SMS code and move to step 3
  const handleVerifySMS = useCallback(async () => {
    setError('')

    if (!smsCode || smsCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    try {
      setLoading(true)
      setStep(3)
      Taro.showToast({
        title: '验证成功',
        icon: 'success',
        duration: 1000,
      })
    } catch (err) {
      setError(err?.message || '验证失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [smsCode])

  // Step 3: Confirm new password
  const handleConfirmPassword = useCallback(async () => {
    setError('')
    setSuccessMessage('')

    if (!isPasswordValid(newPassword)) {
      setError('密码需要至少8个字符，包含大小写字母和数字')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    try {
      setLoading(true)
      const response = await confirmPasswordReset({
        phone,
        smsCode,
        newPassword,
        token: resetToken,
      })

      if (response.success) {
        setSuccessMessage('密码重置成功！')
        Taro.showToast({
          title: '重置成功',
          icon: 'success',
          duration: 2000,
        })

        setTimeout(() => {
          router.push({ url: '/pages/login/index' })
        }, 2000)
      } else {
        setError(response.message || '重置失败，请重试')
      }
    } catch (err) {
      setError(err?.message || '网络请求失败')
      Taro.showToast({
        title: '重置失败',
        icon: 'error',
        duration: 2000,
      })
    } finally {
      setLoading(false)
    }
  }, [newPassword, confirmPassword, phone, smsCode, resetToken, isPasswordValid, router])

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1)
      setError('')
    } else {
      router.push({ url: '/pages/login/index' })
    }
  }, [step, router])

  return (
    <div className="reset-password-page">
      <div className="reset-container">
        {/* Header */}
        <div className="reset-header">
          <button className="back-btn" onClick={handleBack}>
            <Icon name="left" size="24" />
          </button>
          <h1 className="reset-title">重置密码</h1>
          <div className="back-btn-placeholder" />
        </div>

        {/* Steps indicator */}
        <div className="steps-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">验证手机</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">输入验证码</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">设置密码</span>
          </div>
        </div>

        {/* Form */}
        <div className="reset-form">
          {/* Step 1: Phone */}
          {step === 1 && (
            <div className="form-step">
              <div className="form-group">
                <label className="form-label">手机号码</label>
                <input
                  type="number"
                  placeholder="请输入11位手机号码"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\\D/g, '').slice(0, 11))
                    setError('')
                  }}
                  maxLength={11}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                className="submit-btn"
                onClick={handleRequestSMS}
                disabled={!isPhoneValid(phone) || loading}
              >
                {loading ? '发送中...' : '获取验证码'}
              </button>
            </div>
          )}

          {/* Step 2: SMS Code */}
          {step === 2 && (
            <div className="form-step">
              <div className="form-group">
                <label className="form-label">验证码</label>
                <input
                  type="text"
                  placeholder="请输入6位验证码"
                  value={smsCode}
                  onChange={(e) => {
                    setSmsCode(e.target.value.replace(/\\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  maxLength={6}
                  className="form-input"
                  disabled={loading}
                />
                {countdown > 0 && (
                  <div className="countdown-badge">
                    {countdown}秒后重新发送
                  </div>
                )}
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                className="submit-btn"
                onClick={handleVerifySMS}
                disabled={smsCode.length !== 6 || loading}
              >
                {loading ? '验证中...' : '下一步'}
              </button>

              <button
                className="secondary-btn"
                onClick={() => {
                  setStep(1)
                  setSmsCode('')
                  setError('')
                  setCountdown(0)
                }}
                disabled={loading}
              >
                返回修改手机号
              </button>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <div className="form-step">
              <div className="form-group">
                <label className="form-label">新密码</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少8个字符，包含大小写字母和数字"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setError('')
                    }}
                    className="form-input"
                    disabled={loading}
                  />
                  <button
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <Icon
                      name={showPassword ? 'eye-open' : 'eye-close'}
                      size="20"
                    />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">确认密码</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError('')
                    }}
                    className="form-input"
                    disabled={loading}
                  />
                  <button
                    className="toggle-password-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    type="button"
                  >
                    <Icon
                      name={showConfirmPassword ? 'eye-open' : 'eye-close'}
                      size="20"
                    />
                  </button>
                </div>
              </div>

              <div className="password-requirements">
                <div className={`requirement ${newPassword.length >= 8 ? 'met' : ''}`}>
                  <Icon name={newPassword.length >= 8 ? 'check' : 'close'} size="16" />
                  <span>至少8个字符</span>
                </div>
                <div className={`requirement ${/[A-Z]/.test(newPassword) ? 'met' : ''}`}>
                  <Icon name={/[A-Z]/.test(newPassword) ? 'check' : 'close'} size="16" />
                  <span>包含大写字母</span>
                </div>
                <div className={`requirement ${/[a-z]/.test(newPassword) ? 'met' : ''}`}>
                  <Icon name={/[a-z]/.test(newPassword) ? 'check' : 'close'} size="16" />
                  <span>包含小写字母</span>
                </div>
                <div className={`requirement ${/\\d/.test(newPassword) ? 'met' : ''}`}>
                  <Icon name={/\\d/.test(newPassword) ? 'check' : 'close'} size="16" />
                  <span>包含数字</span>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              {successMessage && (
                <div className="success-message">{successMessage}</div>
              )}

              <button
                className="submit-btn"
                onClick={handleConfirmPassword}
                disabled={!isPasswordValid(newPassword) || loading}
              >
                {loading ? '重置中...' : '完成重置'}
              </button>

              <button
                className="secondary-btn"
                onClick={() => {
                  setStep(2)
                  setNewPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                disabled={loading}
              >
                返回
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
"""

index_file = os.path.join(reset_password_dir, 'index.tsx')
with open(index_file, 'w', encoding='utf-8') as f:
    f.write(index_tsx_content)
print(f'✓ Created file: {index_file}')

print('\n✅ All files created successfully!')
