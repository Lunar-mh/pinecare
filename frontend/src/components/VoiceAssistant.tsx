import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './VoiceAssistant.scss'

export default function VoiceAssistant({ active = false, text = '我在听，请说...' }) {
  const [bars, setBars] = useState([10, 15, 8, 12, 20])

  useEffect(() => {
    if (active) {
      const interval = setInterval(() => {
        setBars(prevBars => prevBars.map(() => Math.floor(Math.random() * 25) + 5))
      }, 100)
      return () => clearInterval(interval)
    }
  }, [active])

  if (!active) return null

  return (
    <View className="voice-assistant-overlay">
      <View className="voice-assistant-content">
        <View className="voice-visualizer">
          {bars.map((h, i) => (
            <View key={i} className="voice-bar" style={{ height: `${h}px` }} />
          ))}
        </View>
        <Text className="voice-text">{text}</Text>
      </View>
    </View>
  )
}
