const fs = require('fs');
const path = require('path');

// Create directory
const dirPath = 'D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\reset-password';

if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log('Directory created: ' + dirPath);
}

// Create index.config.ts
const configContent = `export default definePageConfig({
  navigationBarTitleText: '重置密码',
})
`;

fs.writeFileSync(path.join(dirPath, 'index.config.ts'), configContent);
console.log('Created: index.config.ts');

// Create index.tsx with 3-step password reset flow
const indexContent = `import React, { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import { Cell, Icon, Toast } from '@nutui/nutui-react-taro'
import classNames from 'classnames'
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
  const router = useRouter()
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
  const [isLoadingVerify, setIsLoadingVerify] = useState(false)
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
  const handleSendCode = async () => {
    if (!validatePhone(formData.phone)) {
      return
    }

    setIsLoadingSendCode(true)
    try {
      const response = await requestPasswordReset({ phone: formData.phone })
      if (response.success) {
        Toast.show('验证码已发送')
        setCountdownSeconds(60)
        setIsCountingDown(true)
        // Auto proceed to step 2 after successful code send
        setTimeout(() => {
          setCurrentStep(2)
        }, 500)
      } else {
        Toast.show(response.message || '发送验证码失败')
      }
    } catch (error) {
      Toast.show('发送验证码失败，请重试')
      console.error('Send code error:', error)
    } finally {
      setIsLoadingSendCode(false)
    }
  }

  // Verify code and proceed to step 3
  const handleVerifyCode = () => {
    if (!validateCode(formData.code)) {
      return
    }
    setCurrentStep(3)
  }

  // Reset password
  const handleResetPassword = async () => {
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
      if (response.success) {
        Toast.show('密码重置成功')
        setTimeout(() => {
          Taro.navigateBack({ delta: 1 })
        }, 1000)
      } else {
        Toast.show(response.message || '重置密码失败')
      }
    } catch (error) {
      Toast.show('重置密码失败，请重试')
      console.error('Reset password error:', error)
    } finally {
      setIsLoadingReset(false)
    }
  }

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
                className={classNames('progress-step', {
                  active: currentStep >= step,
                  current: currentStep === step,
                })}
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
                  className={classNames('input-field', { error: errors.phone })}
                  type="number"
                  placeholder="请输入手机号"
                  value={formData.phone}
                  onInput={e => handleInputChange('phone', e.detail.value)}
                  maxLength={11}
                />
                {errors.phone && <View className="error-message">{errors.phone}</View>}
              </View>

              <Button
                className={classNames('btn-primary', { loading: isLoadingSendCode })}
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
                  className={classNames('input-field code-input', { error: errors.code })}
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
                  className={classNames('input-field', { error: errors.newPassword })}
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
                  className={classNames('input-field', { error: errors.confirmPassword })}
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
                  className={classNames('btn-primary', { loading: isLoadingReset })}
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
}
`;

fs.writeFileSync(path.join(dirPath, 'index.tsx'), indexContent);
console.log('Created: index.tsx');

// Create index.scss
const scssContent = `.reset-password-page {
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
      }

      .input-field {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 16px;
        box-sizing: border-box;
        transition: all 0.3s ease;

        &:focus {
          border-color: #0066cc;
          background: #f8f9fa;
        }

        &.error {
          border-color: #ff4d4f;
        }

        &.code-input {
          letter-spacing: 4px;
          font-size: 18px;
          font-weight: 500;
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
        background: #0066cc;
        color: #fff;
        margin-top: 24px;

        &:not(:disabled):active {
          background: #0052a3;
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        &.loading {
          opacity: 0.7;
        }
      }

      &.btn-secondary {
        background: #f0f0f0;
        color: #333;
        margin-right: 12px;

        &:not(:disabled):active {
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
      }
    }
  }
}
`;

fs.writeFileSync(path.join(dirPath, 'index.scss'), scssContent);
console.log('Created: index.scss');

console.log('\\nAll files created successfully!');
`;

fs.writeFileSync('D:\\03_Study\\Desktop\\old\\frontend\\src\\pages\\create-reset-password-final2.js', createScript);
console.log('Script file created. Now executing...');
