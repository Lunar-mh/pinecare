require('fs').mkdirSync('D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\reset-password', { recursive: true }); require('fs').writeFileSync('D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\reset-password\\index.config.ts', `export default definePageConfig({
  navigationBarTitleText: '重置密码',
})`); require('fs').writeFileSync('D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\reset-password\\index.tsx', `import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'
import './index.scss'

type StepType = 1 | 2 | 3

interface ResetPasswordData {
  phone: string
  code: string
  newPassword: string
  confirmPassword: string
}

export default function ResetPasswordPage() {
  const [currentStep, setCurrentStep] = useState<StepType>(1)
  const [formData, setFormData] = useState<ResetPasswordData>({
    phone: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  })

  // SMS countdown state
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [isCountingDown, setIsCountingDown] = useState(false)

  // Loading states
  const [isLoadingSendCode, setIsLoadingSendCode] = useState(false)
  const [isLoadingReset, setIsLoadingReset] = useState(false)

  // Error states
  const [errors, setErrors] = useState({
    phone: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Countdown timer effect
  useEffect(() => {
    let timer: any
    if (isCountingDown && countdownSeconds > 0) {
      timer = setTimeout(() => {
        setCountdownSeconds(countdownSeconds - 1)
      }, 1000)
    } else if (countdownSeconds === 0 && isCountingDown) {
      setIsCountingDown(false)
    }
    return () => clearTimeout(timer)
  }, [countdownSeconds, isCountingDown])

  // Handle input change
  const handleInputChange = (field: keyof ResetPasswordData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }))
    }
  }

  // Validate phone
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\\d{9}$/
    if (!phone) {
      setErrors(prev => ({ ...prev, phone: '请输入手机号' }))
      return false
    }
    if (!phoneRegex.test(phone)) {
      setErrors(prev => ({ ...prev, phone: '请输入正确的手机号' }))
      return false
    }
    return true
  }

  // Validate verification code
  const validateCode = (code: string): boolean => {
    if (!code) {
      setErrors(prev => ({ ...prev, code: '请输入验证码' }))
      return false
    }
    if (code.length !== 6) {
      setErrors(prev => ({ ...prev, code: '验证码为6位数字' }))
      return false
    }
    return true
  }

  // Validate password
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setErrors(prev => ({ ...prev, newPassword: '请输入新密码' }))
      return false
    }
    if (password.length < 6) {
      setErrors(prev => ({ ...prev, newPassword: '密码至少6位' }))
      return false
    }
    return true
  }

  // Validate confirm password
  const validateConfirmPassword = (confirmPassword: string, newPassword: string): boolean => {
    if (!confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '请确认密码' }))
      return false
    }
    if (confirmPassword !== newPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '两次输入密码不一致' }))
      return false
    }
    return true
  }

  // Send SMS code
  const handleSendCode = useCallback(async () => {
    if (!validatePhone(formData.phone)) {
      return
    }

    setIsLoadingSendCode(true)
    try {
      const response = await requestPasswordReset({ phone: formData.phone })
      if (response.success || response.code === 0) {
        Taro.showToast({ title: '验证码已发送', icon: 'success' })
        setCountdownSeconds(60)
        setIsCountingDown(true)
        // Auto proceed to step 2 after successful code send
        setTimeout(() => {
          setCurrentStep(2)
        }, 500)
      } else {
        Taro.showToast({ title: response.message || '发送验证码失败', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '发送验证码失败，请重试', icon: 'none' })
      console.error('Send code error:', error)
    } finally {
      setIsLoadingSendCode(false)
    }
  }, [formData.phone, errors])

  // Verify code and proceed to step 3
  const handleVerifyCode = () => {
    if (!validateCode(formData.code)) {
      return
    }
    setCurrentStep(3)
  }

  // Reset password
  const handleResetPassword = useCallback(async () => {
    if (!validatePassword(formData.newPassword)) {
      return
    }
    if (!validateConfirmPassword(formData.confirmPassword, formData.newPassword)) {
      return
    }

    setIsLoadingReset(true)
    try {
      const response = await confirmPasswordReset({
        phone: formData.phone,
        code: formData.code,
        newPassword: formData.newPassword,
      })
      if (response.success || response.code === 0) {
        Taro.showToast({ title: '密码重置成功', icon: 'success' })
        setTimeout(() => {
          Taro.navigateBack({ delta: 1 })
        }, 1000)
      } else {
        Taro.showToast({ title: response.message || '重置密码失败', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '重置密码失败，请重试', icon: 'none' })
      console.error('Reset password error:', error)
    } finally {
      setIsLoadingReset(false)
    }
  }, [formData, errors])

  // Go back to previous step
  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepType)
    }
  }

  return (
    <View className="reset-password-page">
      <ScrollView scrollY className="scroll-container">
        <View className="reset-container">
          {/* Progress indicator */}
          <View className="progress-indicator">
            {[1, 2, 3].map(step => (
              <View
                key={step}
                className={\`progress-step \${currentStep >= step ? 'active' : ''} \${currentStep === step ? 'current' : ''}\`}
              >
                <View className="step-circle">{step}</View>
                <View className="step-label">
                  {step === 1 && '验证手机'}
                  {step === 2 && '验证码'}
                  {step === 3 && '重置密码'}
                </View>
              </View>
            ))}
          </View>

          {/* Step 1: Phone input */}
          {currentStep === 1 && (
            <View className="step-content">
              <View className="step-title">验证手机号</View>
              <View className="form-group">
                <View className="label">手机号码</View>
                <Input
                  className={\`input-field \${errors.phone ? 'error' : ''}\`}
                  type="number"
                  placeholder="请输入手机号"
                  value={formData.phone}
                  onInput={e => handleInputChange('phone', e.detail.value)}
                  maxLength={11}
                />
                {errors.phone && <View className="error-message">{errors.phone}</View>}
              </View>

              <Button
                className={\`btn-primary \${isLoadingSendCode ? 'loading' : ''}\`}
                onClick={handleSendCode}
                disabled={isLoadingSendCode || isCountingDown}
              >
                {isCountingDown ? \`重新发送(\${countdownSeconds}s)\` : '发送验证码'}
              </Button>
            </View>
          )}

          {/* Step 2: Verification code */}
          {currentStep === 2 && (
            <View className="step-content">
              <View className="step-title">输入验证码</View>
              <View className="form-group">
                <View className="label">6位验证码</View>
                <Input
                  className={\`input-field code-input \${errors.code ? 'error' : ''}\`}
                  type="number"
                  placeholder="请输入验证码"
                  value={formData.code}
                  onInput={e => handleInputChange('code', e.detail.value)}
                  maxLength={6}
                />
                {errors.code && <View className="error-message">{errors.code}</View>}
              </View>

              <View className="step-actions">
                <Button className="btn-secondary" onClick={handleBackStep}>
                  上一步
                </Button>
                <Button className="btn-primary" onClick={handleVerifyCode}>
                  下一步
                </Button>
              </View>
            </View>
          )}

          {/* Step 3: New password */}
          {currentStep === 3 && (
            <View className="step-content">
              <View className="step-title">设置新密码</View>

              <View className="form-group">
                <View className="label">新密码</View>
                <Input
                  className={\`input-field \${errors.newPassword ? 'error' : ''}\`}
                  type="password"
                  placeholder="请输入新密码（至少6位）"
                  value={formData.newPassword}
                  onInput={e => handleInputChange('newPassword', e.detail.value)}
                />
                {errors.newPassword && <View className="error-message">{errors.newPassword}</View>}
              </View>

              <View className="form-group">
                <View className="label">确认密码</View>
                <Input
                  className={\`input-field \${errors.confirmPassword ? 'error' : ''}\`}
                  type="password"
                  placeholder="请再次输入密码"
                  value={formData.confirmPassword}
                  onInput={e => handleInputChange('confirmPassword', e.detail.value)}
                />
                {errors.confirmPassword && (
                  <View className="error-message">{errors.confirmPassword}</View>
                )}
              </View>

              <View className="step-actions">
                <Button className="btn-secondary" onClick={handleBackStep}>
                  上一步
                </Button>
                <Button
                  className={\`btn-primary \${isLoadingReset ? 'loading' : ''}\`}
                  onClick={handleResetPassword}
                  disabled={isLoadingReset}
                >
                  {isLoadingReset ? '重置中...' : '确认重置'}
                </Button>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}`); require('fs').writeFileSync('D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\reset-password\\index.scss', \`.reset-password-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 0;

  .scroll-container {
    height: 100vh;
  }

  .reset-container {
    padding: 24px 20px;
    max-width: 600px;
    margin: 0 auto;
  }

  .progress-indicator {
    display: flex;
    justify-content: space-around;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      .step-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f0f0;
        color: #999;
        font-weight: 500;
        font-size: 14px;
      }

      .step-label {
        font-size: 12px;
        color: #999;
      }

      &.active .step-circle {
        background: #e6f7ff;
        color: #0066cc;
      }

      &.current .step-circle {
        background: #0066cc;
        color: #fff;
      }
    }
  }

  .step-content {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    .step-title {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;

      .label {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
        display: block;
        font-weight: 500;
      }

      .input-field {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 16px;
        box-sizing: border-box;
        transition: all 0.3s ease;
        background: #fff;

        &:focus {
          border-color: #0066cc;
          background: #fafbff;
        }

        &.error {
          border-color: #ff4d4f;
          background: #fff1f0;
        }

        &.code-input {
          letter-spacing: 4px;
          font-size: 18px;
          font-weight: 500;
          text-align: center;
        }
      }

      .error-message {
        color: #ff4d4f;
        font-size: 12px;
        margin-top: 6px;
        display: block;
      }
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      &.btn-primary {
        background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
        color: #fff;
        margin-top: 24px;

        &:active:not(:disabled) {
          background: linear-gradient(135deg, #0052a3 0%, #003d7a 100%);
          transform: scale(0.98);
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        &.loading {
          opacity: 0.8;
        }
      }

      &.btn-secondary {
        background: #f0f0f0;
        color: #333;
        margin-right: 12px;

        &:active:not(:disabled) {
          background: #e0e0e0;
        }
      }
    }

    .step-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;

      .btn-secondary {
        flex: 1;
        margin: 0;
      }

      .btn-primary {
        flex: 1;
        margin: 0;
        margin-top: 0;
      }
    }
  }
}

@media (max-width: 600px) {
  .reset-password-page .reset-container {
    padding: 16px 12px;
  }

  .reset-password-page .step-content {
    padding: 16px;
  }

  .reset-password-page .progress-indicator {
    margin-bottom: 24px;
  }
}\`); console.log('SUCCESS: All files created!');
