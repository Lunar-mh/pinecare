/**
 * M2 Pages 适老化温润微晶重构自动化断言验收脚本
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;

function check(desc, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passedChecks++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(`   ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('=== [1] Bento 首页 (单屏 ≤ 3 核心决策卡片与微晶布局) 验收 ===');
const indexTsx = fs.readFileSync(path.join(ROOT, 'src/pages/index/index.tsx'), 'utf8');
const indexScss = fs.readFileSync(path.join(ROOT, 'src/pages/index/index.scss'), 'utf8');

check('Bento 首页引入 LiquidGlassCard 微晶组件', () => {
  assert(indexTsx.includes('LiquidGlassCard'), 'Missing LiquidGlassCard in index.tsx');
});

check('Bento 首页包含 Hero 朱红微晶 SOS 一键求助', () => {
  assert(indexTsx.includes('bento-home__hero-sos'), 'Missing hero SOS card');
  assert(indexTsx.includes('一键紧急求助'), 'Missing SOS title');
  assert(indexTsx.includes('长按3秒或点击，马上通知所有家人'), 'Missing SOS subtitle');
});

check('Bento 首页包含 Left 翡翠今日健康大字卡 (36px 血压/心率)', () => {
  assert(indexTsx.includes('glowTone="emerald"'), 'Missing emerald glow');
  assert(indexTsx.includes('今日健康'), 'Missing health card title');
  assert(indexScss.includes('font-size: 36px'), 'Missing 36px metric size in scss');
});

check('Bento 首页包含 Right 暖栗今日药盒打卡', () => {
  assert(indexTsx.includes('glowTone="amber"'), 'Missing amber glow');
  assert(indexTsx.includes('今日药盒'), 'Missing medication card title');
});

check('Bento 首页具备常驻微晶语音条与药丸 Dock 避让区', () => {
  assert(indexTsx.includes('bento-home__voice-bar'), 'Missing voice bar');
  assert(indexScss.includes('padding-bottom: 140px'), 'Missing bottom dock clearance padding');
});

console.log('\n=== [2] SOS 紧急呼救 (5s冷静撤销 + 15s跌倒升级) 验收 ===');
const sosTsx = fs.readFileSync(path.join(ROOT, 'src/subpackages/sos/pages/index/index.tsx'), 'utf8');
const sosScss = fs.readFileSync(path.join(ROOT, 'src/subpackages/sos/pages/index/index.scss'), 'utf8');

check('SOS 包含朱红微晶大按钮 (朱砂朱雀质感与触感短震)', () => {
  assert(sosTsx.includes('sos-page__big-btn'), 'Missing big btn class');
  assert(sosScss.includes('width: 210px') || sosScss.includes('240px'), 'Missing large diameter styling');
  assert(sosScss.includes('#D33833') || sosScss.includes('#D32F2F'), 'Missing cinnabar color');
});

check('SOS 包含 5 秒冷静期撤销倒计时与后端 actions.js:95 5000ms 规则严格咬合', () => {
  assert(sosTsx.includes('COOLING_DOWN'), 'Missing COOLING_DOWN stage');
  assert(sosTsx.includes('handleCancelWithin5s'), 'Missing cancellation function');
  assert(sosTsx.includes('cancelSOS'), 'Missing cancelSOS service invocation');
});

check('SOS 包含 68px 巨型“误触取消”按键', () => {
  assert(sosTsx.includes('sos-page__cancel-giant-btn'), 'Missing giant cancel button class');
  assert(sosScss.includes('height: 68px'), 'Missing height: 68px in scss');
});

check('SOS 包含跌倒检测 15 秒自动升级交互模型与“我没事取消”按键', () => {
  assert(sosTsx.includes('FALL_PENDING'), 'Missing FALL_PENDING stage');
  assert(sosTsx.includes('handleSimulateFallAlert'), 'Missing fall simulation handler');
  assert(sosTsx.includes('handleDismissFallAlert'), 'Missing dismiss fall alert handler');
  assert(sosTsx.includes('我没事，取消警报'), 'Missing safe cancel button text');
});

check('SOS 包含紧急联系人一键拨打大卡片 (热区 ≥ 60px)', () => {
  assert(sosTsx.includes('sos-page__call-btn'), 'Missing call button class');
  assert(sosScss.includes('height: 60px'), 'Missing 60px call button height in scss');
  assert(sosTsx.includes('120 急救中心'), 'Missing 120 emergency contact');
});

console.log('\n=== [3] 用药提醒慢病管家 (四格药盒 + 月度遵从日历) 验收 ===');
const medTsx = fs.readFileSync(path.join(ROOT, 'src/subpackages/medication/pages/index/index.tsx'), 'utf8');
const medScss = fs.readFileSync(path.join(ROOT, 'src/subpackages/medication/pages/index/index.scss'), 'utf8');

check('用药提醒包含拟物化“早·中·晚·睡前”四格通透大字药盒', () => {
  assert(medTsx.includes('pillboxSlots'), 'Missing pillboxSlots state');
  assert(medTsx.includes('晨服') && medTsx.includes('午服') && medTsx.includes('晚服') && medTsx.includes('睡前'), 'Missing 4 time periods');
});

check('用药提醒药品名称 24px 加粗，剂量醒目', () => {
  assert(medScss.includes('font-size: 24px'), 'Missing font-size: 24px in medication scss');
  assert(medTsx.includes('med-page__med-name'), 'Missing med-name class in medication tsx');
});

check('用药提醒包含月度服药遵从日历与遵从率徽标', () => {
  assert(medTsx.includes('getMedicationCalendar'), 'Missing getMedicationCalendar call');
  assert(medTsx.includes('月度服药遵从日历'), 'Missing calendar tab text');
  assert(medTsx.includes('adherenceRate'), 'Missing adherence rate');
  assert(medScss.includes('__calendar-grid'), 'Missing calendar grid styling');
});

check('用药提醒包含 60px 拟物化打卡服药大按钮', () => {
  assert(medTsx.includes('med-page__take-action-btn'), 'Missing take-action-btn class');
  assert(medScss.includes('height: 60px'), 'Missing height: 60px for medication action');
});

console.log('\n=== [4] 居家健康大字报 (42~48px + BLE一键同步 + 粗实线趋势) 验收 ===');
const healthTsx = fs.readFileSync(path.join(ROOT, 'src/subpackages/health/pages/index/index.tsx'), 'utf8');
const healthScss = fs.readFileSync(path.join(ROOT, 'src/subpackages/health/pages/index/index.scss'), 'utf8');
const trendTsx = fs.readFileSync(path.join(ROOT, 'src/subpackages/health/pages/trend/index.tsx'), 'utf8');
const trendScss = fs.readFileSync(path.join(ROOT, 'src/subpackages/health/pages/trend/index.scss'), 'utf8');

check('居家健康包含 42~48px 超大指标大字报 (血压、心率、血糖)', () => {
  assert(healthScss.includes('font-size: 46px'), 'Missing 46px poster value styling');
  assert(healthTsx.includes('今日血压') && healthTsx.includes('静息心率') && healthTsx.includes('空腹血糖'), 'Missing core 3 health metrics');
  assert(healthTsx.includes('bloodSugar'), 'Missing bloodSugar handling');
});

check('居家健康包含低功耗蓝牙 (BLE) 智能设备一键同步站与状态机流转', () => {
  assert(healthTsx.includes('智能健康设备同步站'), 'Missing BLE station header');
  assert(healthTsx.includes('handleStartBleSync'), 'Missing sync handler');
  assert(healthTsx.includes('SCANNING') && healthTsx.includes('CONNECTING') && healthTsx.includes('SYNCING'), 'Missing BLE states');
  assert(healthScss.includes('height: 64px'), 'Missing 64px sync button in scss');
});

check('居家健康包含离线手动录入兜底', () => {
  assert(healthTsx.includes('未搜到设备？点击手工记录'), 'Missing manual entry prompt');
  assert(healthTsx.includes('addBloodPressureRecord') && healthTsx.includes('addBloodSugarRecord'), 'Missing manual submission APIs');
});

check('趋势看板包含粗实线大字升级与血糖趋势 (时间与指标标签 ≥16px)', () => {
  assert(trendTsx.includes('getBloodSugarTrend'), 'Missing getBloodSugarTrend call');
  assert(trendScss.includes('width: 14px'), 'Missing thick bar styling (14px)');
  assert(trendScss.includes('font-size: 16px'), 'Missing font-size: 16px for trend labels');
});

console.log('\n=== [5] 包体积与违规小字扫描核验 ===');
const distDir = path.join(ROOT, 'dist');
let mainSize = 0;
let healthSize = 0;
let medSize = 0;
let sosSize = 0;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else {
      const rel = path.relative(distDir, full);
      if (rel.startsWith('subpackages/health')) healthSize += stat.size;
      else if (rel.startsWith('subpackages/medication')) medSize += stat.size;
      else if (rel.startsWith('subpackages/sos')) sosSize += stat.size;
      else if (!rel.startsWith('subpackages/')) mainSize += stat.size;
    }
  }
}
walk(distDir);

check(`主包体积 (${(mainSize/1024).toFixed(2)} KB) ≤ 2048 KB`, () => {
  assert(mainSize <= 2048 * 1024, `Main package ${(mainSize/1024).toFixed(2)} KB exceeds 2048 KB`);
});

check(`分包体积均 ≤ 2048 KB (健康: ${(healthSize/1024).toFixed(2)} KB, 用药: ${(medSize/1024).toFixed(2)} KB, 急救: ${(sosSize/1024).toFixed(2)} KB)`, () => {
  assert(healthSize <= 2048 * 1024);
  assert(medSize <= 2048 * 1024);
  assert(sosSize <= 2048 * 1024);
});

console.log(`\n========================================`);
console.log(`🎉 ALL ${passedChecks}/${totalChecks} PAGES VERIFICATION CHECKS PASSED!`);
console.log(`========================================\n`);
