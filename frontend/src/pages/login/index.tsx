import { useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button } from '@tarojs/components'
import { Phone, Checked, Warning } from '@nutui/icons-react-taro'
import { loginByPhone, loginByWechat } from '@/services/modules/user'
import { sendSmsCode } from '@/services/modules/user'
import './index.scss'

type LoginTab = 'phone' | 'wechat'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [codeError, setCodeError] = useState('')

  // 手机号校验
  const isPhoneValid = (val: string) => /^1[3-9]\d{9}$/.test(val)

  // 发送验证码
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
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '发送失败，请重试', icon: 'none' })
    }
  }, [phone, countdown])

  // 手机号登录
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
      Taro.setStorageSync('token', res.token)
      Taro.setStorageSync('userInfo', JSON.stringify(res.userInfo))
      Taro.reLaunch({ url: '/pages/index/index' })
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '登录失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, code])

  // 微信一键登录
  const handleWechatLogin = useCallback(async () => {
    setLoading(true)
    try {
      const loginRes = await Taro.login()
      const res = await loginByWechat(loginRes.code)
      Taro.setStorageSync('token', res.token)
      Taro.setStorageSync('userInfo', JSON.stringify(res.userInfo))
      Taro.reLaunch({ url: '/pages/index/index' })
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '微信登录失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [])

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
            {/* 手机号输入 */}
            <View className={`login-field ${phoneError ? 'login-field--error' : ''}`}>
              <View className="login-field__icon">
                <Phone size={22} color="#01579b" />
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
                <Warning size={16} color="#e53935" />
                <Text className="login-error__text">{phoneError}</Text>
              </View>
            ) : null}

            {/* 验证码输入 */}
            <View className={`login-field login-field--code ${codeError ? 'login-field--error' : ''}`}>
              <View className="login-field__icon">
                <Checked size={22} color="#01579b" />
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
                  {countdown > 0 ? `${countdown}秒后重发` : '获取验证码'}
                </Text>
              </View>
            </View>
            {codeError ? (
              <View className="login-error">
                <Warning size={16} color="#e53935" />
                <Text className="login-error__text">{codeError}</Text>
              </View>
            ) : null}

            {/* 登录按钮 */}
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
              <Text className="wechat-login__illustration-icon">💚</Text>
            </View>
            <Text className="wechat-login__desc">
              使用微信账号一键登录{'\n'}无需记忆密码，快捷方便
            </Text>
            <Button
              className={`wechat-btn ${loading ? 'wechat-btn--loading' : ''}`}
              openType="getPhoneNumber"
              disabled={loading}
              onClick={handleWechatLogin}
            >
              <Text className="wechat-btn__icon">微信</Text>
              <Text className="wechat-btn__text">{loading ? '登录中...' : '微信一键登录'}</Text>
            </Button>
            <Text className="wechat-login__tip">
              首次登录将自动完成注册
            </Text>
          </View>
        )}
      </View>

      {/* 底部协议 */}
      <View className="login-agreement">
        <Text className="login-agreement__text">
          登录即代表同意
        </Text>
        <Text className="login-agreement__link">《用户服务协议》</Text>
        <Text className="login-agreement__text">和</Text>
        <Text className="login-agreement__link">《隐私政策》</Text>
      </View>
    </View>
  )
}
