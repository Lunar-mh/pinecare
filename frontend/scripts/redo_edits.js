const fs = require('fs');

function applyEdits() {
  // 1. SOS page
  let sos = fs.readFileSync('src/subpackages/sos/pages/index/index.tsx', 'utf8');
  sos = sos.replace(
    /export default function SosPage\(\) \{/,
    `export default function SosPage() {
  const [holdProgress, setHoldProgress] = useState(0)
  const isHolding = useRef(false)
  const holdTimer = useRef<NodeJS.Timeout|null>(null)`
  );
  sos = sos.replace(
    /import \{ useState \} from 'react'/,
    `import { useState, useRef } from 'react'`
  );
  sos = sos.replace(
    /const executeSOS = \(\) => \{[\s\S]*?    \}\)/,
    `const executeSOS = () => {
    if (loading) return
    setLoading(true)
    Taro.vibrateLong()
    
    setTimeout(() => {
      setLoading(false)
      Taro.showToast({
        title: '已发送最高级别求救信号',
        icon: 'success',
        duration: 3000
      })
    }, 1500)
  }

  const handleTouchStart = () => {
    if (loading || countdown > 0) return
    isHolding.current = true
    setHoldProgress(0)
    
    let progress = 0
    holdTimer.current = setInterval(() => {
      progress += 100 / 30 // 3 seconds = 30 * 100ms
      if (progress >= 100) {
        progress = 100
        clearInterval(holdTimer.current!)
        if (isHolding.current) executeSOS()
      }
      setHoldProgress(progress)
    }, 100)
  }

  const handleTouchEnd = () => {
    isHolding.current = false
    if (holdTimer.current) {
      clearInterval(holdTimer.current)
    }
    if (holdProgress < 100) {
      setHoldProgress(0)
    }
  }`
  );
  sos = sos.replace(
    /<View\s*className=\{\`sos-big-btn \$\{loading \? 'sos-big-btn--loading' : ''\}\`\}\s*onClick=\{executeSOS\}\s*>/,
    `<View
            className={\`sos-big-btn \${loading ? 'sos-big-btn--loading' : ''}\`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <View className="sos-progress-ring" style={{ height: \`\${holdProgress}%\` }}></View>`
  );
  sos = sos.replace(
    /<Text className="sos-big-btn__hint">点击发送求救\(最高优先级\)<\/Text>/,
    `<Text className="sos-big-btn__hint">长按3秒发送求救</Text>`
  );
  fs.writeFileSync('src/subpackages/sos/pages/index/index.tsx', sos, 'utf8');

  // 2. Medication page
  let med = fs.readFileSync('src/subpackages/medication/pages/index/index.tsx', 'utf8');
  med = med.replace(
    /export default function MedicationPage\(\) \{/,
    `export default function MedicationPage() {
  const [userRole, setUserRole] = useState('')
  
  useLoad(() => {
    const role = Taro.getStorageSync('userRole')
    if (role) {
      setUserRole(role)
    }
  })`
  );
  med = med.replace(
    /\{activeTab === 'plans' && \(/,
    `{activeTab === 'plans' && (userRole !== 'elder') && (`
  );
  fs.writeFileSync('src/subpackages/medication/pages/index/index.tsx', med, 'utf8');

  // 3. Voice AI page
  let voice = fs.readFileSync('src/subpackages/voice_ai/pages/index/index.tsx', 'utf8');
  voice = voice.replace(
    /<Shell title="语音助手">/,
    `<Shell showTabBar={false}><View className="voice-chat-container">`
  );
  voice = voice.replace(
    /<\/Shell>/,
    `</View></Shell>`
  );
  fs.writeFileSync('src/subpackages/voice_ai/pages/index/index.tsx', voice, 'utf8');

  console.log('Edits applied successfully.');
}
applyEdits();
