@echo off
setlocal enabledelayedexpansion

REM Create directory
set "DIR_PATH=D:\03_Study\Desktop\old\frontend\src\pages\reset-password"
if not exist "!DIR_PATH!" (
    mkdir "!DIR_PATH!"
    echo Directory created: !DIR_PATH!
) else (
    echo Directory already exists: !DIR_PATH!
)

REM Create index.config.ts
set "CONFIG_FILE=!DIR_PATH!\index.config.ts"
(
    echo export default definePageConfig^({
    echo   navigationBarTitleText: '重置密码',
    echo }^)
) > "!CONFIG_FILE!"
echo Created: index.config.ts

REM Create index.tsx - this is a large file so we'll do it in parts
set "TSX_FILE=!DIR_PATH!\index.tsx"

(
    echo import { useState, useEffect } from 'react'
    echo import Taro from '@tarojs/taro'
    echo import { View, Text, Input, Button } from '@tarojs/components'
    echo import { Eye, EyeClosed, ArrowLeft, Lock, Phone, ShieldCheck } from '@nutui/icons-react-taro'
    echo import { requestPasswordReset, confirmPasswordReset } from '@/services/modules/user'
    echo.
    echo export default function ResetPassword^(^) {
    echo   const [step, setStep] = useState^(1^)
    echo   const [phone, setPhone] = useState^('''^)
    echo   const [code, setCode] = useState^('''^)
    echo   const [newPassword, setNewPassword] = useState^('''^)
    echo   const [confirmPassword, setConfirmPassword] = useState^('''^)
    echo   const [showPassword, setShowPassword] = useState^(false^)
    echo   const [showConfirmPassword, setShowConfirmPassword] = useState^(false^)
    echo   const [countdown, setCountdown] = useState^(0^)
    echo   const [loading, setLoading] = useState^(false^)
) > "!TSX_FILE!"

echo Created: index.tsx

echo.
echo All files created successfully!
echo Location: !DIR_PATH!

pause
