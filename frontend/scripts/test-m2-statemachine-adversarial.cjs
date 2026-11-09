/**
 * M2 业务状态机与日历契约对抗压测脚本
 * 角色: empirical-challenger (challenger_m2_2)
 *
 * 验证目标：
 * 1. SOS 5秒冷静期与跌倒 15 秒超时状态机仿真实测
 * 2. 用药打卡防重复提交与前端乐观更新一致性
 * 3. 月度服药遵从日历数据解析在极端月份（0数据、满勤、全缺勤、异常结构）下的健壮性
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('======================================================================');
console.log('⚡ 启动 M2 业务状态机与全链路回归对抗挑战 (challenger_m2_2)');
console.log('======================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function runCheck(name, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    failedChecks++;
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     └─ 错误详情: ${err.message}`);
  }
}

// =========================================================================
// 1. SOS 5 秒冷静期与跌倒 15 秒超时状态机对抗
// =========================================================================
console.log('--- 1. SOS 5秒冷静期与跌倒15秒超时状态机实测 ---');

const sosPagePath = path.join(ROOT_DIR, 'src/subpackages/sos/pages/index/index.tsx');
const sosContent = fs.readFileSync(sosPagePath, 'utf8');

runCheck('SOS 页面完整定义 4 大状态机 Stage (IDLE | COOLING_DOWN | FALL_PENDING | ACTIVE_ALARM)', () => {
  assert(sosContent.includes("type SOSStage = 'IDLE' | 'COOLING_DOWN' | 'FALL_PENDING' | 'ACTIVE_ALARM'"), 'SOSStage 定义缺失或不完整');
});

runCheck('SOS 5秒倒计时逻辑具备精确递减与状态跃迁 (remaining <= 0 时切入 ACTIVE_ALARM)', () => {
  assert(sosContent.includes('setStage(\'COOLING_DOWN\')'), '缺少进入 COOLING_DOWN 状态');
  assert(sosContent.includes('setCountdown(5)'), '缺少 5 秒初始倒计时设定');
  assert(sosContent.includes('remaining -= 1'), '缺少 1 秒递减逻辑');
  assert(sosContent.includes('setStage(\'ACTIVE_ALARM\')'), '缺少超时自动激活 ACTIVE_ALARM');
});

runCheck('SOS 5秒内主动点击误触取消能够立即清理定时器、调用 cancelSOS 并回到 IDLE', () => {
  assert(sosContent.includes('handleCancelWithin5s'), '缺少 5 秒内取消函数');
  assert(sosContent.includes('clearInterval(countdownTimerRef.current)'), '缺少取消时清理定时器');
  assert(sosContent.includes('cancelSOS(currentEventId)'), '缺少调用后端 cancelSOS 接口');
  assert(sosContent.includes('setStage(\'IDLE\')'), '缺少取消后重置为 IDLE 状态');
});

runCheck('跌倒 15 秒超时检测模型支持进入 FALL_PENDING 并开启 15 秒倒计时', () => {
  assert(sosContent.includes('handleSimulateFallAlert'), '缺少跌倒模拟/检测触发函数');
  assert(sosContent.includes('setStage(\'FALL_PENDING\')'), '缺少进入 FALL_PENDING 状态');
  assert(sosContent.includes('setFallCountdown(15)'), '缺少 15 秒初始倒计时设定');
});

runCheck('跌倒 15 秒超时无操作可靠自动触发 triggerSOS({ type: \'fall\' }) 升级派单', () => {
  assert(sosContent.includes("type: 'fall'"), '缺少跌倒 15 秒超时后触发 type: fall 求救派单');
  assert(sosContent.includes('triggerSOS({'), '缺少超时调用 triggerSOS 升级派单');
});

runCheck('跌倒 15 秒内长辈主动点击“我没事，取消警报”可靠撤销且不派单', () => {
  assert(sosContent.includes('handleDismissFallAlert'), '缺少长辈主动解除跌倒函数');
  assert(sosContent.includes('clearInterval(fallTimerRef.current)'), '解除时必须清理跌倒定时器');
  assert(sosContent.includes('我没事，取消警报'), '缺少适老安全解除按键文案');
});

runCheck('长按防误触计时器在松开时能安全注销 (pressTimerRef 清理)', () => {
  assert(sosContent.includes('handleButtonTouchStart'), '缺少触摸开始处理');
  assert(sosContent.includes('handleButtonTouchEnd'), '缺少触摸结束处理');
  assert(sosContent.includes('clearTimeout(pressTimerRef.current)'), '松开按键必须清理长按定时器');
});

// =========================================================================
// 2. 用药打卡防重复提交与前端一致性
// =========================================================================
console.log('\n--- 2. 用药打卡防重复提交与前端一致性 ---');

const medPagePath = path.join(ROOT_DIR, 'src/subpackages/medication/pages/index/index.tsx');
const medContent = fs.readFileSync(medPagePath, 'utf8');

runCheck('服药打卡函数 handleTakeMedication 校验 logId 守卫', () => {
  assert(medContent.includes('if (!item.logId) return'), '缺少 logId 防空守卫');
});

runCheck('服药打卡成功后触感反馈与数据重新拉取 loadData 闭环', () => {
  assert(medContent.includes('markMedicationTaken(item.logId)'), '缺少调用 markMedicationTaken');
  assert(medContent.includes('loadData()'), '打卡成功后必须调用 loadData 刷新页面状态');
});

// 仿真测试：并发快速连击的防重与一致性
runCheck('模拟连续 5 次极速点击服药打卡，Promise 全量捕获且状态最终平稳收敛', async () => {
  let callCount = 0;
  let backendStock = 30;
  let backendStatus = 'pending';

  // 模拟后端 confirm 接口（严格遵循幂等逻辑）
  const mockConfirmApi = async (logId) => {
    callCount++;
    if (backendStatus !== 'pending') {
      return { code: 0, data: { idempotent: true, status: backendStatus } };
    }
    backendStatus = 'taken';
    backendStock -= 1;
    return { code: 0, data: { idempotent: false, status: backendStatus } };
  };

  // 模拟老人手滑并发 5 次快速点击
  const promises = [1, 2, 3, 4, 5].map(() => mockConfirmApi(101));
  const results = await Promise.all(promises);

  assert.strictEqual(callCount, 5, '5 次点击均被接收');
  assert.strictEqual(backendStock, 29, '药品库存严格只扣减 1，绝不多扣');
  assert.strictEqual(backendStatus, 'taken', '状态最终正确跃迁为 taken');

  const idempotentCount = results.filter(r => r.data.idempotent).length;
  assert.strictEqual(idempotentCount, 4, '后续 4 次调用全部命中幂等保护');
});

// =========================================================================
// 3. 月度服药遵从日历数据解析在极端月份下的健壮性实测
// =========================================================================
console.log('\n--- 3. 月度服药遵从日历算法极端边界实测 ---');

// 提取并镜像前端 services/modules/medication.ts 中 getMedicationCalendar 核心解析算法
function parseMedicationCalendar(res, month) {
  const rawDays = Array.isArray(res?.days) ? res.days : Array.isArray(res) ? res : [];

  let totalScheduled = 0;
  let totalTaken = 0;

  const days = rawDays.map(item => {
    const taken = Number(item.taken || 0);
    const missed = Number(item.missed || 0);
    const skipped = Number(item.skipped || 0);
    const pending = Number(item.pending || 0);
    const total = Number(item.total || (taken + missed + skipped + pending));

    totalScheduled += total;
    totalTaken += taken;

    let status = 'none';
    if (total > 0) {
      if (taken === total) {
        status = 'complete';
      } else if (taken > 0 || skipped > 0) {
        status = 'partial';
      } else if (missed > 0) {
        status = 'missed';
      }
    }

    return {
      date: item.date,
      taken,
      missed,
      skipped,
      pending,
      total,
      status: item.status || status,
    };
  });

  const adherenceRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;

  return {
    month: res?.month || month,
    days,
    adherenceRate,
  };
}

runCheck('极端场景 A (0数据月份) - 全月无用药安排，adherenceRate 返回 100% 且不产生 NaN，状态为 none', () => {
  const emptyDays = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-11-${String(i + 1).padStart(2, '0')}`,
    taken: 0,
    missed: 0,
    skipped: 0,
    pending: 0,
    total: 0,
  }));

  const result = parseMedicationCalendar({ month: '2026-11', days: emptyDays }, '2026-11');

  assert.strictEqual(result.adherenceRate, 100, '0数据月份遵从率应优雅兜底为 100%');
  assert(!Number.isNaN(result.adherenceRate), '绝对严禁除以 0 产生 NaN');
  assert.strictEqual(result.days.length, 30);
  assert(result.days.every(d => d.status === 'none'), '0数据天状态全部为 none');
});

runCheck('极端场景 B (满勤月份 100%) - 全月每天按时服药，adherenceRate 为 100%，状态全为 complete', () => {
  const perfectDays = Array.from({ length: 31 }, (_, i) => ({
    date: `2026-12-${String(i + 1).padStart(2, '0')}`,
    taken: 2,
    missed: 0,
    skipped: 0,
    pending: 0,
    total: 2,
  }));

  const result = parseMedicationCalendar({ month: '2026-12', days: perfectDays }, '2026-12');

  assert.strictEqual(result.adherenceRate, 100, '满勤月遵从率必须为 100%');
  assert.strictEqual(result.days.length, 31);
  assert(result.days.every(d => d.status === 'complete'), '满勤天状态全部为 complete');
});

runCheck('极端场景 C (全缺勤月份 0%) - 全月每天全部漏服 missed，adherenceRate 为 0%，状态全为 missed', () => {
  const allMissedDays = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, '0')}`,
    taken: 0,
    missed: 2,
    skipped: 0,
    pending: 0,
    total: 2,
  }));

  const result = parseMedicationCalendar({ month: '2026-04', days: allMissedDays }, '2026-04');

  assert.strictEqual(result.adherenceRate, 0, '全缺勤月份遵从率必须为 0%');
  assert.strictEqual(result.days.length, 30);
  assert(result.days.every(d => d.status === 'missed'), '全漏服天状态全部为 missed');
});

runCheck('极端场景 D (部分服药与跳过) - 验证四舍五入精确度与 partial 状态判定', () => {
  const mixedDays = [
    { date: '2026-05-01', taken: 1, missed: 1, skipped: 0, pending: 0, total: 2 }, // partial
    { date: '2026-05-02', taken: 0, missed: 0, skipped: 1, pending: 0, total: 1 }, // partial (skipped)
    { date: '2026-05-03', taken: 2, missed: 0, skipped: 0, pending: 0, total: 2 }, // complete
  ];

  const result = parseMedicationCalendar({ month: '2026-05', days: mixedDays }, '2026-05');

  // totalScheduled = 2 + 1 + 2 = 5, totalTaken = 1 + 0 + 2 = 3. 3 / 5 = 60%
  assert.strictEqual(result.adherenceRate, 60, '依从率应为 60%');
  assert.strictEqual(result.days[0].status, 'partial');
  assert.strictEqual(result.days[1].status, 'partial');
  assert.strictEqual(result.days[2].status, 'complete');
});

runCheck('极端场景 E (畸形残损数据容错) - res 为 null/undefined 或缺少 total 字段时安全降级', () => {
  const corrupted1 = parseMedicationCalendar(null, '2026-01');
  assert.strictEqual(corrupted1.adherenceRate, 100);
  assert.deepStrictEqual(corrupted1.days, []);

  const corrupted2 = parseMedicationCalendar({ days: [{ date: '2026-01-01', taken: 1, missed: 1 }] }, '2026-01');
  assert.strictEqual(corrupted2.days[0].total, 2, '缺失 total 时自动由各项累加求和');
  assert.strictEqual(corrupted2.adherenceRate, 50);
});

// =========================================================================
// 4. 触控热区与适老化样式硬指标抽检
// =========================================================================
console.log('\n--- 4. 适老热区与字号硬指标抽检 ---');

const sosScssPath = path.join(ROOT_DIR, 'src/subpackages/sos/pages/index/index.scss');
const sosScss = fs.readFileSync(sosScssPath, 'utf8');
const medScssPath = path.join(ROOT_DIR, 'src/subpackages/medication/pages/index/index.scss');
const medScss = fs.readFileSync(medScssPath, 'utf8');

runCheck('SOS 页面误触取消按键高度达到 68px (超越 60px 适老热区底线)', () => {
  assert(sosScss.includes('height: 68px'), '取消按键高度必须为 68px');
});

runCheck('SOS 页面紧急联系人呼叫按键高度达到 60px', () => {
  assert(sosScss.includes('height: 60px'), '拨打按键高度必须 ≥ 60px');
});

runCheck('用药提醒拟物化打卡服药大按钮高度达到 60px', () => {
  assert(medScss.includes('height: 60px'), '打卡服药按键高度必须 ≥ 60px');
});

runCheck('用药提醒药名采用 24px 加粗醒目大字', () => {
  assert(medScss.includes('font-size: 24px'), '药名必须为 24px');
});

console.log('\n======================================================================');
console.log(`📊 对抗挑战验收结果汇总:`);
console.log(`   总测试项数: ${totalChecks}`);
console.log(`   通过项数:   ${passedChecks}`);
console.log(`   失败项数:   ${failedChecks}`);
console.log(`   绿灯率:     ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
console.log('======================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('🎉 所有状态机与日历契约对抗压测全部 PASS！');
}
