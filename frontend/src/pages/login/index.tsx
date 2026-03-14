import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { loginByPhone, loginByWechat, sendSmsCode } from '@/services/modules/user'
import { Icon, PhoneIcon, AlertIcon, InfoIcon, UserIcon, FamilyIcon } from '@/components/icons'
import './index.scss'

type LoginTab = 'phone' | 'wechat'
type UserRole = 'elder' | 'family'

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState<UserRole>('elder')
  const [activeTab, setActiveTab] = useState<LoginTab>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [codeError, setCodeError] = useState('')

  useEffect(() => {
    const storedRole = Taro.getStorageSync('userRole') as UserRole
    if (storedRole === 'elder' || storedRole === 'family') {
      setActiveRole(storedRole)
    }
  }, [])

  const isPhoneValid = (val: string) => /^1[3-9]\d{9}$/.test(val)

  const onLoginSuccess = useCallback((payload: { token: string; refresh_token?: string; userInfo: unknown }) => {
    Taro.setStorageSync('token', payload.token)
    if (payload.refresh_token) {
      Taro.setStorageSync('refresh_token', payload.refresh_token)
    } else {
      Taro.removeStorageSync('refresh_token')
    }
    Taro.setStorageSync('userInfo', JSON.stringify(payload.userInfo))
    Taro.setStorageSync('userRole', activeRole)
    Taro.reLaunch({ url: '/pages/role-select/index' })
  }, [activeRole])

  const handleSendCode = useCallback(async () => {
    if (countdown > 0) return
    if (!isPhoneValid(phone)) {
      setPhoneError('请输入正确的手机号')
      return
    }

    setPhoneError('')
    try {
      await sendSmsCode(phone)
      Taro.showToast({ title: '验证码已发送', icon: 'success' })
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
    }
  }, [phone, countdown])

  const handlePhoneLogin = useCallback(async () => {
    if (!isPhoneValid(phone)) {
      setPhoneError('请输入正确的手机号')
      return
    }
    if (code.length !== 6) {
      setCodeError('请输入 6 位验证码')
      return
    }

    setPhoneError('')
    setCodeError('')
    setLoading(true)
    try {
      const result = await loginByPhone(phone, code)
      onLoginSuccess(result)
    } catch (error) {
      const err = error as { message?: string }
      Taro.showToast({ title: err.message || '登录失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, code, onLoginSuccess])

  const handleWechatLogin = useCallback(async () => {
    setLoading(true)
    try {
      const loginRes = await Taro.login()
      const result = await loginByWechat(loginRes.code)
      onLoginSuccess(result)
    } catch (error) {
      const err = error as { message?: string }
      Taro.showToast({ title: err.message || '微信登录失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [onLoginSuccess])

  return (
    <View className={`login-page login-page--${activeRole}`}>
      <View className="login-hero">
        <View className="login-hero__badge">银伴全域智慧照护</View>
        <Text className="login-hero__title">把照护做得更安心，也更轻松</Text>
        <Text className="login-hero__subtitle">先选择您的身份，再用熟悉的方式登录。</Text>
      </View>

      <View className="login-panel">
        <View className="login-stage">
          <Text className="login-stage__index">01</Text>
          <Text className="login-stage__title">选择当前身份</Text>
        </View>

        <View className="login-role-grid">
          <View className={`login-role-card ${activeRole === 'elder' ? 'login-role-card--active' : ''}`} onClick={() => setActiveRole('elder')}>
            <View className="login-role-card__icon login-role-card__icon--elder">
              <UserIcon size={32} color="#2f6c5b" />
            </View>
            <Text className="login-role-card__title">我是长辈</Text>
            <Text className="login-role-card__desc">健康管理、用药提醒、紧急守护和语音陪伴。</Text>
          </View>
          <View className={`login-role-card login-role-card--family ${activeRole === 'family' ? 'login-role-card--active' : ''}`} onClick={() => setActiveRole('family')}>
            <View className="login-role-card__icon login-role-card__icon--family">
              <FamilyIcon size={32} color="#c97b55" />
            </View>
            <Text className="login-role-card__title">我是家属</Text>
            <Text className="login-role-card__desc">远程看护、异常提醒、定位守护与家庭互动。</Text>
          </View>
        </View>

        <View className="login-stage">
          <Text className="login-stage__index">02</Text>
          <Text className="login-stage__title">选择登录方式</Text>
        </View>

        <View className="login-tabs">
          <View className={`login-tab ${activeTab === 'phone' ? 'login-tab--active' : ''}`} onClick={() => setActiveTab('phone')}>
            <Text className="login-tab__text">手机号登录</Text>
          </View>
          <View className={`login-tab ${activeTab === 'wechat' ? 'login-tab--active' : ''}`} onClick={() => setActiveTab('wechat')}>
            <Text className="login-tab__text">微信快捷登录</Text>
          </View>
        </View>

        {activeTab === 'phone' ? (
          <View className="login-form">
            <View className={`login-field ${phoneError ? 'login-field--error' : ''}`}>
              <View className="login-field__icon"><PhoneIcon size={20} color="#8d98a3" /></View>
              <Input
                className="login-field__input"
                type="number"
                maxlength={11}
                value={phone}
                placeholder="请输入手机号"
                onInput={(event) => {
                  setPhone(event.detail.value.replace(/\\D/g, '').slice(0, 11))
                  if (phoneError) setPhoneError('')
                }}
              />
            </View>
            {phoneError ? (
              <View className="login-error">
                <AlertIcon size={16} color="#d75a4a" />
                <Text className="login-error__text">{phoneError}</Text>
              </View>
            ) : null}

            <View className={`login-field ${codeError ? 'login-field--error' : ''}`}>
              <View className="login-field__icon"><Icon name="eye" size={20} color="#8d98a3" /></View>
              <Input
                className="login-field__input"
                type="number"
                maxlength={6}
                value={code}
                placeholder="请输入验证码"
                onInput={(event) => {
                  setCode(event.detail.value.replace(/\\D/g, '').slice(0, 6))
                  if (codeError) setCodeError('')
                }}
              />
              <View className={`send-code-btn ${countdown > 0 ? 'send-code-btn--disabled' : ''}`} onClick={handleSendCode}>
                <Text className="send-code-btn__text">{countdown > 0 ? `${countdown}s` : '发送验证码'}</Text>
              </View>
            </View>
            {codeError ? (
              <View className="login-error">
                <AlertIcon size={16} color="#d75a4a" />
                <Text className="login-error__text">{codeError}</Text>
              </View>
            ) : null}

        {process.env.NODE_ENV === 'development' && (
          <View className="login-tip">
            <InfoIcon size={16} color="#3d7ca6" />
            <Text className="login-tip__text">开发环境可使用固定验证码 000000。</Text>
          </View>
        )}

            <View className={`login-submit ${loading ? 'login-submit--loading' : ''}`} onClick={loading ? undefined : handlePhoneLogin}>
              <Text className="login-submit__text">{loading ? '登录中...' : '进入银伴'}</Text>
            </View>
          </View>
        ) : (
          <View className="wechat-panel">
            <View className="wechat-panel__icon"><Icon name="check" size={40} color="#4b8d63" /></View>
            <Text className="wechat-panel__text">使用微信授权快速登录，登录后将进入对应身份首页。</Text>
            <View className={`login-submit login-submit--wechat ${loading ? 'login-submit--loading' : ''}`} onClick={loading ? undefined : handleWechatLogin}>
              <Text className="login-submit__text">{loading ? '登录中...' : '微信快捷登录'}</Text>
            </View>
          </View>
        )}

        <View className="login-benefits">
          <View className="login-benefits__item">
            <Text className="login-benefits__title">适老体验</Text>
            <Text className="login-benefits__desc">更大字号、更清晰层级、主操作更靠前。</Text>
          </View>
          <View className="login-benefits__item">
            <Text className="login-benefits__title">家庭协同</Text>
            <Text className="login-benefits__desc">长辈与家属同应用分角色进入，关系更清楚。</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
