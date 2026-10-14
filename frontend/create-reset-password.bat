@echo off
REM Create password reset page files for Taro mini-program

set "DIR_PATH=%~dp0src\pages\reset-password"

REM Create directory
if not exist "%DIR_PATH%" (
    mkdir "%DIR_PATH%"
    echo Created directory: %DIR_PATH%
) else (
    echo Directory exists: %DIR_PATH%
)

REM Create index.config.ts
(
    echo export default definePageConfig({
    echo   navigationBarTitleText: '重置密码',
    echo   navigationBarBackgroundColor: '#01579b',
    echo   navigationBarTextStyle: 'white',
    echo ^}
) > "%DIR_PATH%\index.config.ts"
echo Created file: index.config.ts

REM Create index.tsx
(
    echo import { useState, useCallback, useEffect } from 'react'
    echo import Taro from '@tarojs/taro'
    echo import { View, Text, Input } from '@tarojs/components'
    echo import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'
    echo import { Icon } from '@/components/icons'
    echo.
    echo export default function ResetPasswordPage() {
    echo   const [step, setStep] = useState(1)
    echo   const [phone, setPhone] = useState('')
    echo   const [code, setCode] = useState('')
    echo   const [newPassword, setNewPassword] = useState('')
    echo   const [confirmPassword, setConfirmPassword] = useState('')
    echo   const [countdown, setCountdown] = useState(0)
    echo   const [loading, setLoading] = useState(false)
    echo   const [showPassword, setShowPassword] = useState(false)
    echo   const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    echo.
    echo   // Countdown timer effect
    echo   useEffect(() => {
    echo     if (countdown ^> 0) {
    echo       const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    echo       return () => clearTimeout(timer)
    echo     }
    echo   }, [countdown])
    echo.
    echo   // Phone validation: 11 digits starting with 1
    echo   const isPhoneValid = useCallback((phoneNum: string) => {
    echo     return /^1[3-9]\d{9}$/.test(phoneNum)
    echo   }, [])
    echo.
    echo   // Password validation: 8+ chars with uppercase, lowercase, digit
    echo   const isPasswordValid = useCallback((pwd: string) => {
    echo     return pwd.length ^>= 8 ^&^& /[A-Z]/.test(pwd) ^&^& /[a-z]/.test(pwd) ^&^& /\d/.test(pwd)
    echo   }, [])
    echo.
    echo   // Step 1: Send verification code
    echo   const handleSendCode = useCallback(async () => {
    echo     if (countdown ^> 0) return
    echo     if (!isPhoneValid(phone)) {
    echo       Taro.showToast({ title: '请输入有效的手机号码', icon: 'none' })
    echo       return
    echo     }
    echo.
    echo     setLoading(true)
    echo     try {
    echo       await requestPasswordReset({ phone })
    echo       Taro.showToast({ title: '验证码已发送', icon: 'success' })
    echo       setCountdown(60)
    echo       setStep(2)
    echo     } catch (error: any) {
    echo       Taro.showToast({ title: error.message ^|^| '发送失败', icon: 'none' })
    echo     } finally {
    echo       setLoading(false)
    echo     }
    echo   }, [phone, countdown, isPhoneValid])
    echo.
    echo   // Step 2: Verify code
    echo   const handleVerifyCode = useCallback(async () => {
    echo     if (code.length !=^= 6) {
    echo       Taro.showToast({ title: '请输入6位验证码', icon: 'none' })
    echo       return
    echo     }
    echo     setStep(3)
    echo   }, [code])
    echo.
    echo   // Step 3: Reset password
    echo   const handleResetPassword = useCallback(async () => {
    echo     if (!isPasswordValid(newPassword)) {
    echo       Taro.showToast({ title: '密码至少8位，包含大小写字母和数字', icon: 'none' })
    echo       return
    echo     }
    echo     if (newPassword !=^= confirmPassword) {
    echo       Taro.showToast({ title: '两次输入的密码不一致', icon: 'none' })
    echo       return
    echo     }
    echo.
    echo     setLoading(true)
    echo     try {
    echo       await confirmPasswordReset({ phone, code, newPassword })
    echo       Taro.showToast({ title: '密码重置成功', icon: 'success' })
    echo       setTimeout(() => {
    echo         Taro.navigateBack()
    echo       }, 1500)
    echo     } catch (error: any) {
    echo       Taro.showToast({ title: error.message ^|^| '重置失败', icon: 'none' })
    echo     } finally {
    echo       setLoading(false)
    echo     }
    echo   }, [phone, code, newPassword, confirmPassword, isPasswordValid])
    echo.
    echo   return (
    echo     ^<View className="min-h-screen bg-white flex flex-col"^>
    echo       {/* Header */}
    echo       ^<View className="pt-16 px-8 pb-10 flex flex-col items-center"^>
    echo         ^<View className="w-20 h-20 bg-yinban-primary/10 rounded-3xl flex items-center justify-center mb-6"^>
    echo           ^<Icon name="lock" size={48} color="#10B981" /^>
    echo         ^</View^>
    echo         ^<Text className="text-dash-hero font-bold text-dash-text-main mb-3"^>重置密码^</Text^>
    echo         ^<Text className="text-dash-body text-dash-text-sub text-center"^>
    echo           {step === 1 ^&^& '请输入注册手机号'}
    echo           {step === 2 ^&^& '请输入验证码'}
    echo           {step === 3 ^&^& '请设置新密码'}
    echo         ^</Text^>
    echo       ^</View^>
    echo.
    echo       {/* Form Content */}
    echo       ^<View className="px-8 flex-1"^>
    echo         {/* Step 1: Phone Input */}
    echo         {step === 1 ^&^& (
    echo           ^<View className="space-y-6"^>
    echo             ^<View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4"^>
    echo               ^<Icon name="phone" size={24} color="#64748B" /^>
    echo               ^<Input
    echo                 className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
    echo                 type="number"
    echo                 maxlength={11}
    echo                 value={phone}
    echo                 placeholder="请输入手机号"
    echo                 placeholderTextColor="#94A3B8"
    echo                 onInput={(e) => setPhone(e.detail.value.replace(/\D/g, '').slice(0, 11))}
    echo               /^>
    echo             ^</View^>
    echo.
    echo             ^<View
    echo               className={`h-14 rounded-full flex items-center justify-center transition-all ${
    echo                 loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'
    echo               }`}
    echo               onClick={loading ? undefined : handleSendCode}
    echo             ^>
    echo               ^<Text className="text-white text-dash-title font-bold"^>
    echo                 {countdown ^> 0 ? `${countdown}s 后重新获取` : '发送验证码'}
    echo               ^</Text^>
    echo             ^</View^>
    echo           ^</View^>
    echo         )}
    echo.
    echo         {/* Step 2: Code Input */}
    echo         {step === 2 ^&^& (
    echo           ^<View className="space-y-6"^>
    echo             ^<View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4"^>
    echo               ^<Icon name="shield-check" size={24} color="#64748B" /^>
    echo               ^<Input
    echo                 className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
    echo                 type="number"
    echo                 maxlength={6}
    echo                 value={code}
    echo                 placeholder="请输入验证码"
    echo                 placeholderTextColor="#94A3B8"
    echo                 onInput={(e) => setCode(e.detail.value.replace(/\D/g, '').slice(0, 6))}
    echo               /^>
    echo             ^</View^>
    echo.
    echo             ^<View
    echo               className={`h-14 rounded-full flex items-center justify-center transition-all ${
    echo                 loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'
    echo               }`}
    echo               onClick={code.length === 6 ? handleVerifyCode : undefined}
    echo             ^>
    echo               ^<Text className="text-white text-dash-title font-bold"^>
    echo                 {loading ? '验证中...' : '下一步'}
    echo               ^</Text^>
    echo             ^</View^>
    echo.
    echo             ^<View className="flex justify-center"^>
    echo               ^<Text
    echo                 className="text-dash-tiny text-yinban-primary active:opacity-50"
    echo                 onClick={() => setStep(1)}
    echo               ^>
    echo                 返回修改手机号
    echo               ^</Text^>
    echo             ^</View^>
    echo           ^</View^>
    echo         )}
    echo.
    echo         {/* Step 3: Password Input - Similar structure to steps 1 and 2 */}
    echo         {step === 3 ^&^& (
    echo           ^<View className="space-y-6"^>
    echo             ^<View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4"^>
    echo               ^<Icon name="lock" size={24} color="#64748B" /^>
    echo               ^<Input
    echo                 className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
    echo                 password={!showPassword}
    echo                 value={newPassword}
    echo                 placeholder="请输入新密码"
    echo                 placeholderTextColor="#94A3B8"
    echo                 onInput={(e) => setNewPassword(e.detail.value)}
    echo               /^>
    echo               ^<View onClick={() => setShowPassword(!showPassword)}^>
    echo                 ^<Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" /^>
    echo               ^</View^>
    echo             ^</View^>
    echo.
    echo             ^<View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4"^>
    echo               ^<Icon name="lock" size={24} color="#64748B" /^>
    echo               ^<Input
    echo                 className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
    echo                 password={!showConfirmPassword}
    echo                 value={confirmPassword}
    echo                 placeholder="请确认密码"
    echo                 placeholderTextColor="#94A3B8"
    echo                 onInput={(e) => setConfirmPassword(e.detail.value)}
    echo               /^>
    echo               ^<View onClick={() => setShowConfirmPassword(!showConfirmPassword)}^>
    echo                 ^<Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" /^>
    echo               ^</View^>
    echo             ^</View^>
    echo.
    echo             ^<View className="bg-yinban-bg/50 p-4 rounded-2xl space-y-2"^>
    echo               ^<Text className="text-dash-tiny text-dash-text-sub"^>密码要求:^</Text^>
    echo               ^<Text className={`text-dash-tiny ${newPassword.length ^>= 8 ? 'text-green-500' : 'text-dash-text-sub'}`}^>
    echo                 ✓ 至少8个字符
    echo               ^</Text^>
    echo               ^<Text className={`text-dash-tiny ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-dash-text-sub'}`}^>
    echo                 ✓ 包含大写字母
    echo               ^</Text^>
    echo               ^<Text className={`text-dash-tiny ${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-dash-text-sub'}`}^>
    echo                 ✓ 包含小写字母
    echo               ^</Text^>
    echo               ^<Text className={`text-dash-tiny ${/\d/.test(newPassword) ? 'text-green-500' : 'text-dash-text-sub'}`}^>
    echo                 ✓ 包含数字
    echo               ^</Text^>
    echo             ^</View^>
    echo.
    echo             ^<View
    echo               className={`h-14 rounded-full flex items-center justify-center transition-all mt-8 ${
    echo                 loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'
    echo               }`}
    echo               onClick={loading ? undefined : handleResetPassword}
    echo             ^>
    echo               ^<Text className="text-white text-dash-title font-bold"^>
    echo                 {loading ? '重置中...' : '完成重置'}
    echo               ^</Text^>
    echo             ^</View^>
    echo.
    echo             ^<View className="flex justify-center"^>
    echo               ^<Text
    echo                 className="text-dash-tiny text-yinban-primary active:opacity-50"
    echo                 onClick={() => setStep(2)}
    echo               ^>
    echo                 返回验证
    echo               ^</Text^>
    echo             ^</View^>
    echo           ^</View^>
    echo         )}
    echo       ^</View^>
    echo     ^</View^>
    echo   )
    echo }
) > "%DIR_PATH%\index.tsx"
echo Created file: index.tsx

echo.
echo ✅ Password reset page files created successfully!
echo.
pause
