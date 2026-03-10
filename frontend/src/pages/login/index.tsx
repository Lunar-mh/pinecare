import { useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { loginByPhone, loginByWechat, sendSmsCode } from '@/services/modules/user'
import { Icon, PhoneIcon, AlertIcon, InfoIcon, UserIcon, FamilyIcon } from '@/components/icons'
import './index.scss'

type LoginTab = 'phone' | 'wechat'
type Step = 'login' | 'selectRole'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('login')
  const [activeTab, setActiveTab] = useState<LoginTab>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [codeError, setCodeError] = useState('')

  const isPhoneValid = (val: string) => /^1[3-9]\d{9}$/.test(val)

  const handleSendCode = useCallback(async () => {
    if (countdown > 0) return
    if (!isPhoneValid(phone)) {
      setPhoneError('请输入正确的手机号码')
      return
    }
    setPhoneError('')
    try {
      await sendSmsCode(phone)
      Taro.showToast({ title: '验证码已发送', icon: 'success', duration: 2000 })
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
    } catch (e: unknown) {
      const err = e as { message?: string }
      Taro.showToast({ title: err?.message || '发送失败，请重试', icon: 'none' })
    }
  }, [phone, countdown])

  // 登录成功后判断是否需要选择角色
  const onLoginSuccess = useCallback((token: string, userInfo: unknown) => {
    Taro.setStorageSync('token', token)
    Taro.setStorageSync('userInfo', JSON.stringify(userInfo))
    const existingRole = Taro.getStorageSync('userRole')
    if (existingRole === 'elder' || existingRole === 'family') {
      Taro.reLaunch({ url: '/pages/index/index' })
    } else {
      setStep('selectRole')
    }
  }, [])

  const handlePhoneLogin = useCallback(async () => {
    if (!isPhoneValid(phone)) {
      setPhoneError('请输入正确的手机号码')
      return
    }
    if (!code || code.length !== 6) {
      setCodeError('请输入6位验证码')
      return
    }
    setPhoneError('')
    setCodeError('')
    setLoading(true)
    try {
      const res = await loginByPhone(phone, code)
      onLoginSuccess(res.token, res.userInfo)
    } catch (e: unknown) {
      const err = e as { message?: string }
      Taro.showToast({ title: err?.message || '登录失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, code, onLoginSuccess])

  const handleWechatLogin = useCallback(async () => {
    setLoading(true)
    try {
      const loginRes = await Taro.login()
      const res = await loginByWechat(loginRes.code)
      onLoginSuccess(res.token, res.userInfo)
    } catch (e: unknown) {
      const err = e as { message?: string }
      Taro.showToast({ title: err?.message || '微信登录失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [onLoginSuccess])

  const handleSelectRole = useCallback((role: 'elder' | 'family') => {
    Taro.setStorageSync('userRole', role)
    Taro.reLaunch({ url: '/pages/index/index' })
  }, [])

  // ===== 角色选择步骤 =====
  if (step === 'selectRole') {
    return (
      <View className="login-page login-page--role">
        <View className="role-header">
          <View className="role-header__logo">
            <Text className="role-header__logo-text">银</Text>
          </View>
          <Text className="role-header__title">欢迎使用银伴</Text>
          <Text className="role-header__sub">请选择您的使用身份</Text>
        </View>

        <View className="role-cards">
          <View className="role-card role-card--elder" onClick={() => handleSelectRole('elder')}>
            <View className="role-card__icon-wrap role-card__icon-wrap--elder">
              <UserIcon size={48} color="#01579b" />
            </View>
            <Text className="role-card__name">我是长辈</Text>
            <Text className="role-card__desc">健康管理、用药提醒{'\n'}紧急SOS守护</Text>
            <View className="role-card__arrow">
              <Icon name="chevron-right" size={20} color="#01579b" />
            </View>
          </View>

          <View className="role-card role-card--family" onClick={() => handleSelectRole('family')}>
            <View className="role-card__icon-wrap role-card__icon-wrap--family">
              <FamilyIcon size={48} color="#2e7d32" />
            </View>
            <Text className="role-card__name">我是家属</Text>
            <Text className="role-card__desc">远程关注、健康监护{'\n'}家庭空间互动</Text>
            <View className="role-card__arrow">
              <Icon name="chevron-right" size={20} color="#2e7d32" />
            </View>
          </View>
        </View>

        <Text className="role-footer">身份可在"我的"页面随时切换</Text>
      </View>
    )
  }

  // ===== 登录步骤 =====
  return (
    <View className="login-page">
      {/* 顶部品牌区 */}
      <View className="login-brand">
        <View className="login-brand__logo">
          <Text className="login-brand__logo-text">银</Text>
        </View>
        <Text className="login-brand__name">银伴</Text>
        <Text className="login-brand__slogan">您贴心的健康伙伴</Text>
      </View>

      {/* 登录卡片 */}
      <View className="login-card">
        {/* Tab 切换 */}
        <View className="login-tabs">
          <View
            className={`login-tab ${activeTab === 'phone' ? 'login-tab--active' : ''}`}
            onClick={() => setActiveTab('phone')}
          >
            <Text className="login-tab__text">手机号登录</Text>
          </View>
          <View
            className={`login-tab ${activeTab === 'wechat' ? 'login-tab--active' : ''}`}
            onClick={() => setActiveTab('wechat')}
          >
            <Text className="login-tab__text">微信登录</Text>
          </View>
        </View>

        {/* 手机号登录表单 */}
        {activeTab === 'phone' && (
          <View className="login-form">
            <View className={`login-field ${phoneError ? 'login-field--error' : ''}`}>
              <View className="login-field__icon">
                <PhoneIcon size={22} color="#999" />
              </View>
              <Input
                className="login-field__input"
                type="number"
                value={phone}
                placeholder="请输入手机号"
                maxlength={11}
                onInput={e => {
                  setPhone(e.detail.value)
                  if (phoneError) setPhoneError('')
                }}
              />
            </View>
            {phoneError ? (
              <View className="login-error">
                <AlertIcon size={16} color="#e53935" />
                <Text className="login-error__text">{phoneError}</Text>
              </View>
            ) : null}

            <View className={`login-field login-field--code ${codeError ? 'login-field--error' : ''}`}>
              <View className="login-field__icon">
                <Icon name="eye" size={22} color="#999" />
              </View>
              <Input
                className="login-field__input"
                type="number"
                value={code}
                placeholder="请输入验证码"
                maxlength={6}
                onInput={e => {
                  setCode(e.detail.value)
                  if (codeError) setCodeError('')
                }}
              />
              <View
                className={`send-code-btn ${countdown > 0 ? 'send-code-btn--disabled' : ''}`}
                onClick={handleSendCode}
              >
                <Text className="send-code-btn__text">
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Text>
              </View>
            </View>
            {codeError ? (
              <View className="login-error">
                <AlertIcon size={16} color="#e53935" />
                <Text className="login-error__text">{codeError}</Text>
              </View>
            ) : null}

            <View className="login-dev-tip">
              <InfoIcon size={16} color="#1e88e5" />
              <Text className="login-dev-tip__text">开发模式：验证码输入 000000</Text>
            </View>

            <View
              className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
              onClick={loading ? undefined : handlePhoneLogin}
            >
              <Text className="login-btn__text">{loading ? '登录中...' : '登 录'}</Text>
            </View>
          </View>
        )}

        {/* 微信登录 */}
        {activeTab === 'wechat' && (
          <View className="wechat-login">
            <View className="wechat-login__illustration">
              <Icon name="check" size={52} color="#07c160" />
            </View>
            <Text className="wechat-login__desc">
              使用微信账号一键登录{'\n'}无需记忆密码，快捷方便
            </Text>
            <View
              className={`wechat-btn ${loading ? 'wechat-btn--loading' : ''}`}
              onClick={loading ? undefined : handleWechatLogin}
            >
              <Text className="wechat-btn__text">{loading ? '登录中...' : '微信一键登录'}</Text>
            </View>
            <Text className="wechat-login__tip">首次登录将自动完成注册</Text>
          </View>
        )}
      </View>

      {/* 底部协议 */}
      <View className="login-agreement">
        <Text className="login-agreement__text">登录即代表同意</Text>
        <Text className="login-agreement__link">《用户服务协议》</Text>
        <Text className="login-agreement__text">和</Text>
        <Text className="login-agreement__link">《隐私政策》</Text>
      </View>
    </View>
  )
}
