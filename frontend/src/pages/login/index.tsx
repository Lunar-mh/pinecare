import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Image } from '@tarojs/components'
import { loginByPhone, loginByWechat, sendSmsCode } from '@/services/modules/user'
import { Icon } from '@/components/icons'

type LoginTab = 'phone' | 'wechat'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  // 初始化时清除之前的角色选择，确保必须重新选择
  useEffect(() => {
    Taro.removeStorageSync('userRole')
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
    // 登录成功后，跳转到专门的身份选择页面
    Taro.reLaunch({ url: '/pages/role-select/index' })
  }, [])

  const handleSendCode = useCallback(async () => {
    if (countdown > 0) return
    if (!isPhoneValid(phone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

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
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (code.length !== 6) {
      Taro.showToast({ title: '请输入 6 位验证码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const result = await loginByPhone(phone, code)
      onLoginSuccess(result)
    } catch (error) {
      const err = error as { message?: string }
      Taro.showToast({ title: err.message || '登录失败，请检查验证码', icon: 'none' })
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
    <View className="min-h-screen bg-white flex flex-col">
      {/* 顶部 Hero 区域 */}
      <View className="pt-24 px-8 pb-10 flex flex-col items-center">
        <View className="w-20 h-20 bg-yinban-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Icon name="heart-pulse" size={48} color="#10B981" />
        </View>
        <Text className="text-dash-hero font-bold text-dash-text-main mb-3">欢迎来到青松安护</Text>
        <Text className="text-dash-body text-dash-text-sub text-center">PineCare 智慧照护平台，守护您的每一天</Text>
      </View>

      {/* 登录表单区域 */}
      <View className="px-8 flex-1">
        {/* 登录方式切换 Tab */}
        <View className="flex border-b border-dash-border mb-8">
          <View 
            className={`flex-1 pb-3 text-center ${activeTab === 'phone' ? 'border-b-2 border-yinban-primary' : ''}`}
            onClick={() => setActiveTab('phone')}
          >
            <Text className={`text-dash-title font-medium ${activeTab === 'phone' ? 'text-yinban-primary' : 'text-dash-text-sub'}`}>手机快捷登录</Text>
          </View>
          <View 
            className={`flex-1 pb-3 text-center ${activeTab === 'wechat' ? 'border-b-2 border-yinban-primary' : ''}`}
            onClick={() => setActiveTab('wechat')}
          >
            <Text className={`text-dash-title font-medium ${activeTab === 'wechat' ? 'text-yinban-primary' : 'text-dash-text-sub'}`}>微信一键登录</Text>
          </View>
        </View>

        {activeTab === 'phone' ? (
          <View className="space-y-6">
            {/* 手机号输入框 */}
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="phone" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type="number"
                maxlength={11}
                value={phone}
                placeholder="请输入手机号"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setPhone(event.detail.value.replace(/\D/g, '').slice(0, 11))}
              />
            </View>

            {/* 验证码输入框 */}
            <View className="bg-yinban-bg h-14 rounded-2xl flex items-center px-4">
              <Icon name="shield-check" size={24} color="#64748B" />
              <Input
                className="flex-1 ml-3 text-dash-body text-dash-text-main h-full"
                type="number"
                maxlength={6}
                value={code}
                placeholder="请输入验证码"
                placeholderTextColor="#94A3B8"
                onInput={(event) => setCode(event.detail.value.replace(/\D/g, '').slice(0, 6))}
              />
              <View 
                className={`px-4 h-8 rounded-full flex items-center justify-center transition-opacity ${countdown > 0 ? 'bg-gray-200' : 'bg-yinban-primary/10 active:opacity-50'}`}
                onClick={handleSendCode}
              >
                <Text className={`text-dash-tiny font-medium ${countdown > 0 ? 'text-gray-500' : 'text-yinban-primary'}`}>
                  {countdown > 0 ? `${countdown}s 后重新获取` : '获取验证码'}
                </Text>
              </View>
            </View>

            {process.env.NODE_ENV === 'development' && (
              <Text className="block text-center text-dash-tiny text-dash-text-sub">
                开发环境提示: 测试手机号可直接输入验证码 000000
              </Text>
            )}

            {/* 忘记密码链接 */}
            <View className="flex justify-end">
              <Text 
                className="text-dash-tiny text-yinban-primary active:opacity-50"
                onClick={() => Taro.showToast({ title: '请使用手机验证码直接登录', icon: 'none' })}
              >
                忘记密码？
              </Text>
            </View>

            {/* 登录按钮 */}
            <View 
              className={`h-14 rounded-full flex items-center justify-center transition-all mt-8 ${loading ? 'bg-yinban-primary/70' : 'bg-yinban-primary active:scale-[0.98]'}`}
              onClick={loading ? undefined : handlePhoneLogin}
            >
              <Text className="text-white text-dash-title font-bold">{loading ? '登录中...' : '登录 / 注册'}</Text>
            </View>
          </View>
        ) : (
          <View className="flex flex-col items-center justify-center py-10">
            <View className="w-20 h-20 bg-[#07C160]/10 rounded-full flex items-center justify-center mb-6">
              <Icon name="wechat" size={48} color="#07C160" />
            </View>
            <Text className="text-dash-body text-dash-text-sub text-center px-6 mb-10">
              平台将获取您的微信公开信息（如昵称、头像）以快速创建或绑定账户。
            </Text>
            <View 
              className={`w-full h-14 rounded-full flex items-center justify-center transition-all ${loading ? 'bg-[#07C160]/70' : 'bg-[#07C160] active:scale-[0.98]'}`}
              onClick={loading ? undefined : handleWechatLogin}
            >
              <Text className="text-white text-dash-title font-bold">{loading ? '登录中...' : '授权微信登录'}</Text>
            </View>
          </View>
        )}
      </View>
      
      {/* 底部协议声明 */}
      <View className="pb-10 flex justify-center items-center px-8">
        <Text className="text-dash-tiny text-dash-text-sub text-center">
          登录即代表您同意青松安护<Text className="text-yinban-primary">《用户服务协议》</Text>与<Text className="text-yinban-primary">《隐私政策》</Text>
        </Text>
      </View>
    </View>
  )
}