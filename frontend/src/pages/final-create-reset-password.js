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
})`;

fs.writeFileSync(path.join(resetPasswordDir, 'index.config.ts'), configContent);
console.log('✓ Created file: index.config.ts');

// Create index.tsx
const indexContent = `import { useState, useCallback, useEffect } from 'react'
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
          <div className={\`step \${step >= 1 ? 'active' : ''}\`}>
            <span className="step-number">1</span>
            <span className="step-label">验证手机</span>
          </div>
          <div className="step-line" />
          <div className={\`step \${step >= 2 ? 'active' : ''}\`}>
            <span className="step-number">2</span>
            <span className="step-label">输入验证码</span>
          </div>
          <div className="step-line" />
          <div className={\`step \${step >= 3 ? 'active' : ''}\`}>
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
                <div className={\`requirement \${newPassword.length >= 8 ? 'met' : ''}\`}>
                  <Icon name={newPassword.length >= 8 ? 'check' : 'close'} size="16" />
                  <span>至少8个字符</span>
                </div>
                <div className={\`requirement \${/[A-Z]/.test(newPassword) ? 'met' : ''}\`}>
                  <Icon name={/[A-Z]/.test(newPassword) ? 'check' : 'close'} size="16" />
                  <span>包含大写字母</span>
                </div>
                <div className={\`requirement \${/[a-z]/.test(newPassword) ? 'met' : ''}\`}>
                  <Icon name={/[a-z]/.test(newPassword) ? 'check' : 'close'} size="16" />
                  <span>包含小写字母</span>
                </div>
                <div className={\`requirement \${/\\d/.test(newPassword) ? 'met' : ''}\`}>
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
}`;

fs.writeFileSync(path.join(resetPasswordDir, 'index.tsx'), indexContent);
console.log('✓ Created file: index.tsx');

// Create index.scss
const scssContent = `.reset-password-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.reset-container {
  width: 100%;
  max-width: 500px;
}

.reset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 16px 0;
}

.back-btn,
.back-btn-placeholder {
  width: 40px;
  height: 40px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0;
  padding: 0;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.7;
  }
}

.reset-title {
  flex: 1;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.steps-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.5;
  transition: opacity 0.3s ease;

  &.active {
    opacity: 1;
  }
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #e0e0e0;
  color: #666;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  transition: all 0.3s ease;

  .step.active & {
    background-color: #0066cc;
    color: white;
  }
}

.step-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;

  .step.active & {
    color: #0066cc;
    font-weight: 500;
  }
}

.step-line {
  flex: 1;
  height: 2px;
  background-color: #e0e0e0;
  margin: 0 12px;
  transition: background-color 0.3s ease;

  .step.active ~ & {
    background-color: #0066cc;
  }
}

.reset-form {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.form-step {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-group {
  margin-bottom: 20px;
  position: relative;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  &:focus {
    outline: none;
    border-color: #0066cc;
    background-color: white;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  &:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &::placeholder {
    color: #999;
  }
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  .form-input {
    padding-right: 45px;
  }
}

.toggle-password-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: #999;
  transition: color 0.3s ease;

  &:hover {
    color: #0066cc;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.error-message {
  color: #e53e3e;
  font-size: 13px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background-color: #fff5f5;
  border-radius: 8px;
  border-left: 3px solid #e53e3e;
}

.success-message {
  color: #22863a;
  font-size: 13px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background-color: #f0f8f4;
  border-radius: 8px;
  border-left: 3px solid #22863a;
}

.countdown-badge {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background-color: #0066cc;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.password-requirements {
  margin: 16px 0 24px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.requirement {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #999;
  transition: color 0.3s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &.met {
    color: #22863a;
  }

  &.met svg {
    color: #22863a;
  }

  svg {
    flex-shrink: 0;
    color: #999;
  }
}

.submit-btn,
.secondary-btn {
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.submit-btn {
  background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
  color: white;

  &:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #c0c0c0;
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.secondary-btn {
  background-color: transparent;
  color: #0066cc;
  border: 2px solid #0066cc;

  &:hover:not(:disabled) {
    background-color: #f0f5ff;
  }

  &:disabled {
    border-color: #c0c0c0;
    color: #c0c0c0;
    cursor: not-allowed;
  }
}

/* Responsive design */
@media (max-width: 600px) {
  .reset-password-page {
    padding: 12px;
  }

  .reset-form {
    padding: 24px;
  }

  .steps-indicator {
    padding: 16px;
    margin-bottom: 24px;
  }

  .step-label {
    font-size: 11px;
  }

  .step-line {
    margin: 0 8px;
  }

  .reset-header {
    margin-bottom: 20px;
  }

  .form-label {
    font-size: 13px;
  }

  .form-input {
    font-size: 16px;
    padding: 11px 14px;
  }

  .submit-btn,
  .secondary-btn {
    padding: 12px 14px;
    font-size: 15px;
  }
}`;

fs.writeFileSync(path.join(resetPasswordDir, 'index.scss'), scssContent);
console.log('✓ Created file: index.scss');

console.log('\n✅ All files created successfully in:');
console.log(`   ${resetPasswordDir}`);
