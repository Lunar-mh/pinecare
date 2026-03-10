import { View, Text, Button, ScrollView, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { post } from '@/services/request'
import './index.scss'

const FAQS = [
  {
    id: 1,
    question: '如何绑定健康设备？',
    answer: '请进入"我的" -> "设备绑定"页面，点击"扫码绑定新设备"，扫描设备上的二维码即可完成绑定。'
  },
  {
    id: 2,
    question: '如何添加紧急联系人？',
    answer: '请进入"我的" -> "紧急联系人"页面，点击底部"添加联系人"按钮，填写姓名、电话和关系后保存即可。最多可添加5位联系人。'
  },
  {
    id: 3,
    question: '用药提醒不响怎么办？',
    answer: '请检查手机是否开启了静音模式，并确保在"系统设置"中开启了"用药提醒"开关。同时请允许微信发送通知。'
  },
  {
    id: 4,
    question: '如何切换家属模式？',
    answer: '在"我的"页面顶部，点击"家属模式"按钮即可切换。切换后可以查看绑定的长辈健康数据。'
  }
]

export default function Feedback() {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleFaq = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleCallService = () => {
    Taro.makePhoneCall({
      phoneNumber: '400-000-0000',
      fail: (err) => {
        console.error('Call failed', err)
      }
    })
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) {
      Taro.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }

    setSubmitting(true)
    Taro.showLoading({ title: '提交中...' })
    
    try {
      await post('/user/feedback', { content: feedbackContent })
      Taro.hideLoading()
      Taro.showToast({ title: '感谢您的反馈', icon: 'success' })
      setFeedbackContent('')
    } catch (e: unknown) {
      Taro.hideLoading()
      Taro.showToast({ title: '提交失败，请重试', icon: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="feedback-page">
      <ScrollView scrollY className="feedback-scroll">
        <View className="section">
          <View className="section-title">
            <Text>常见问题</Text>
          </View>
          <View className="faq-list">
            {FAQS.map(faq => (
              <View key={faq.id} className="faq-item">
                <View 
                  className="faq-question" 
                  onClick={() => toggleFaq(faq.id)}
                >
                  <Text className="question-text">{faq.question}</Text>
                  <Text className={`arrow ${expandedId === faq.id ? 'arrow-up' : 'arrow-down'}`}></Text>
                </View>
                {expandedId === faq.id && (
                  <View className="faq-answer">
                    <Text className="answer-text">{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View className="section">
          <View className="section-title">
            <Text>意见反馈</Text>
          </View>
          <View className="feedback-form">
            <Textarea
              className="feedback-input"
              placeholder="请详细描述您遇到的问题或建议..."
              value={feedbackContent}
              onInput={(e) => setFeedbackContent(e.detail.value)}
              maxlength={500}
            />
            <Text className="word-count">{feedbackContent.length}/500</Text>
            <Button 
              className="submit-btn" 
              onClick={handleSubmitFeedback}
              disabled={submitting}
            >
              提交反馈
            </Button>
          </View>
        </View>

        <View className="section contact-section">
          <Text className="contact-tips">还有其他问题？</Text>
          <Button className="service-btn" onClick={handleCallService}>
            联系人工客服 (400-000-0000)
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
