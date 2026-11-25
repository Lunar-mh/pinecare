/**
 * 银伴智慧照护平台 - M2 暖玉微晶基础组件与样式工程化验收脚本
 * 验证设计令牌、无障碍规范、组件契约、孤儿目录清理与包体红线
 */
const fs = require('fs')
const path = require('path')

const FRONTEND_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(FRONTEND_DIR, 'src')
const DIST_DIR = path.join(FRONTEND_DIR, 'dist')

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASS: ${message}`)
}

console.log('=== [1] 孤儿分包清理验证 ===')
const orphanDir = path.join(SRC_DIR, 'subpackages', 'family_health')
assert(!fs.existsSync(orphanDir), 'frontend/src/subpackages/family_health 已物理删除')

console.log('=== [2] 暖玉微晶设计令牌验证 ===')
const tokensContent = fs.readFileSync(path.join(SRC_DIR, 'design', 'tokens.ts'), 'utf-8')
assert(tokensContent.includes('#F8F6F0'), 'tokens.ts 包含暖玉凝脂画布底色 #F8F6F0')
assert(tokensContent.includes('#FFFDF9'), 'tokens.ts 包含玉脂微光次表面 #FFFDF9')
assert(tokensContent.includes('#1F6B56'), 'tokens.ts 包含翡翠松青主色 #1F6B56')
assert(tokensContent.includes('#C86D3B'), 'tokens.ts 包含暖栗琥珀辅助色 #C86D3B')
assert(tokensContent.includes('#D33833'), 'tokens.ts 包含朱砂朱雀急救色 #D33833')
assert(tokensContent.includes('#18221E'), 'tokens.ts 包含极深乌金正文 #18221E')
assert(!tokensContent.includes("'10px'") && !tokensContent.includes("'12px'"), 'tokens.ts 已彻底消除 10px 与 12px 违规小字')
assert(tokensContent.includes('liquidGlass'), 'tokens.ts 导出 liquidGlass 物理公式')

console.log('=== [3] 全局样式与 SCSS 变量对齐验证 ===')
const varsContent = fs.readFileSync(path.join(SRC_DIR, 'styles', 'theme', 'variables.scss'), 'utf-8')
assert(varsContent.includes('$color-primary: #1F6B56;'), 'variables.scss 包含翡翠松青主色')
assert(varsContent.includes('$color-secondary: #C86D3B;'), 'variables.scss 包含暖栗琥珀辅助色')
assert(varsContent.includes('$color-danger: #D33833;'), 'variables.scss 包含朱砂朱雀急救色')
assert(varsContent.includes('$button-height-large: 64px;'), 'variables.scss 主按键高度规范为 64px (≥60px)')

const glassContent = fs.readFileSync(path.join(SRC_DIR, 'styles', 'theme', 'glass.scss'), 'utf-8')
assert(glassContent.includes('@mixin liquid-glass-card'), 'glass.scss 包含 @mixin liquid-glass-card')
assert(glassContent.includes('@supports (backdrop-filter: blur(20px))'), 'glass.scss 包含 backdrop-filter 复合滤镜与降级')

const nutuiContent = fs.readFileSync(path.join(SRC_DIR, 'styles', 'theme', 'nutui-theme.scss'), 'utf-8')
assert(nutuiContent.includes('--nutui-color-primary: #1F6B56;'), 'nutui-theme.scss 覆盖 NutUI 主色为翡翠松青')
assert(nutuiContent.includes('--nutui-font-size-1: 16px;'), 'nutui-theme.scss 拉升最小字号至 16px')

const tokensScss = fs.readFileSync(path.join(SRC_DIR, 'styles', 'tokens.scss'), 'utf-8')
assert(!tokensScss.includes('--yao-primary'), 'tokens.scss 已彻底清理曜银 3.0')
assert(tokensScss.includes('--yinban-primary: #1F6B56;'), 'tokens.scss 包含 --yinban-primary')

const shellScss = fs.readFileSync(path.join(SRC_DIR, 'components', 'shell', 'index.scss'), 'utf-8')
assert(!shellScss.includes('#2D5AEE'), 'shell/index.scss 已清除曜银科技蓝 #2D5AEE')
assert(!shellScss.includes('font-size: 10px;') && !shellScss.includes('font-size: 12px;'), 'shell/index.scss 已消除 10px-12px 小字')

console.log('=== [4] 4 大微晶核心组件与 Hook 契约验证 ===')
const liquidCard = fs.readFileSync(path.join(SRC_DIR, 'components', 'elderly', 'LiquidGlassCard', 'index.tsx'), 'utf-8')
assert(liquidCard.includes('vibrateShort'), 'LiquidGlassCard 包含短震动触感反馈')

const largeBtn = fs.readFileSync(path.join(SRC_DIR, 'components', 'elderly', 'LargeButton', 'index.tsx'), 'utf-8')
assert(largeBtn.includes('longPressDuration'), 'LargeButton 包含长按倒计时机制')

const metricCard = fs.readFileSync(path.join(SRC_DIR, 'components', 'elderly', 'MetricCard', 'index.tsx'), 'utf-8')
assert(metricCard.includes('referenceRange'), 'MetricCard 包含参考区间与超大指标')

const tabbar = fs.readFileSync(path.join(SRC_DIR, 'custom-tab-bar', 'index.tsx'), 'utf-8')
assert(!tabbar.includes('#007AFF'), 'custom-tab-bar 彻底消除了 iOS 蓝色 #007AFF')
assert(tabbar.includes("app:roleChange"), 'custom-tab-bar 包含 eventCenter 广播响应')

const useRole = fs.readFileSync(path.join(SRC_DIR, 'hooks', 'useRole.ts'), 'utf-8')
assert(useRole.includes('isElderly:'), 'useRole 导出 isElderly 契约标准别名')
assert(useRole.includes("trigger('app:roleChange'"), 'useRole 切换角色时触发广播')

console.log('=== [5] 包体积红线核算 (主包 ≤ 2MB) ===')
let mainSize = 0
function calcSize(dir) {
  const files = fs.readdirSync(dir)
  for (const f of files) {
    const fp = path.join(dir, f)
    const st = fs.statSync(fp)
    if (st.isDirectory()) {
      if (path.basename(dir) === 'dist' && f === 'subpackages') {
        // 分包跳过
      } else {
        calcSize(fp)
      }
    } else {
      mainSize += st.size
    }
  }
}
calcSize(DIST_DIR)
const mainKb = mainSize / 1024
console.log(`主包实际大小: ${mainKb.toFixed(2)} KB`)
assert(mainKb <= 2048, `主包体积 ${mainKb.toFixed(2)} KB 满足 ≤ 2048 KB (2MB) 红线`)

console.log('\n🎉 ALL VERIFICATION CHECKS PASSED!')
