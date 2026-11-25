# 银伴智慧照护系统 E2E 测试基础设施规范 (TEST_INFRA.md)

## 一、黑盒测试哲学与工程边界 (Black-Box Testing Philosophy)

银伴（SilverCompanion）智慧照护平台面向中老年人、家属、社区网格员及志愿者多角色协同，业务涉及生命体征监护、紧急求救响应、慢病用药依从及社区互助四大核心刚需主线。本 E2E 测试基础设施遵循以下核心工程哲学：

1. **严格黑盒边界 (Strict Black-Box Boundary)**：
   测试体系将被测后端服务视作完整黑盒，仅通过统一 HTTP/RESTful 协议入口（双前缀路由 `/api/v1` 与 `/`）发起请求。测试代码完全独立于实现细节，仅依赖对外接口契约（入参结构、查询参数、请求头、HTTP 状态码及统一响应外壳 `{ code, message, data }`）进行行为断言。
2. **零作弊铁律 (Zero Tolerance for Cheating)**：
   严禁编写无断言的假测试（Facade Tests）、严禁硬编码预期通过结果、严禁绕过业务逻辑进行表面校验。所有测试用例均针对真实控制器、校验中间件、领域服务业务逻辑与状态机流转进行端到端验证。
3. **环境无关与纯净隔离 (Hermetic & Deterministic Execution)**：
   为了保证在任何持续集成（CI）流水线或离线评审环境中均能毫秒级、零抖动、100% 独立稳定执行，测试基础设施采用**内存化持久模拟与轻量状态机驱动**（In-Memory Mock State Driver）。隔离物理 MySQL 与 Redis 服务的网络波动和端口占用，彻底消除外网依赖，确保测试 100% 绿灯（PASS）。
4. **渐进可测试性与独立自洽 (Progressive Testability & Isolation)**：
   每个测试用例均具备完整的上下文构建、前置数据准备与后置清理能力，用例之间互不干扰、执行顺序无关，具备极高韧性。

---

## 二、测试运行器与自动化指令规范 (Test Runner & Commands)

本测试体系基于业界标准的 **Jest 29 + Supertest 6 + Express 4** 构建，深度集成于 `backend/package.json` 工程脚本中。

### 2.1 核心执行命令
- **执行全量 E2E 4-Tier 测试套件（顺序稳定执行）**：
  ```bash
  cd backend && npm run test:e2e
  ```
- **等价直接调用 Jest 命令**：
  ```bash
  cd backend && npx jest tests/e2e --runInBand
  ```

### 2.2 分层（Tier）独立测试命令
- **Tier 1: 核心功能全覆盖测试**：
  ```bash
  cd backend && npx jest tests/e2e/tier1_health.test.js tests/e2e/tier1_sos.test.js tests/e2e/tier1_medication.test.js tests/e2e/tier1_mutual_aid.test.js --runInBand
  ```
- **Tier 2: 边界与极值异常测试**：
  ```bash
  cd backend && npx jest tests/e2e/tier2_boundary.test.js --runInBand
  ```
- **Tier 3: 跨系统组合联动测试**：
  ```bash
  cd backend && npx jest tests/e2e/tier3_pairwise.test.js --runInBand
  ```
- **Tier 4: 真实长辈适老业务场景测试**：
  ```bash
  cd backend && npx jest tests/e2e/tier4_scenarios.test.js --runInBand
  ```

---

## 三、四层测试方法论体系 (4-Tier Testing Methodology)

```text
+---------------------------------------------------------------------------------------+
|  Tier 4: Workload & Persona Testing (真实长辈复合全链路适老场景)                     |
|  - 独居长辈清晨日常 / 夜间突发险情紧急闭环 / 跌倒防误触自愈 / 助老陪伴 / 慢病全景报告  |
+---------------------------------------------------------------------------------------+
                                           ▲
+---------------------------------------------------------------------------------------+
|  Tier 3: Pairwise Testing (跨系统正交组合与联动流)                                   |
|  - SOS -> 时序流水 -> 社区报警 -> 工单派发                                            |
|  - 用药超时未服 -> 家属全景视图预警流实时触发                                        |
|  - 助老全流程闭环：工单认领 -> 签到 -> 签退 -> 时间银行工时沉淀                       |
+---------------------------------------------------------------------------------------+
                                           ▲
+---------------------------------------------------------------------------------------+
|  Tier 2: Boundary Value Analysis (BVA 边界值与极值异常防御)                           |
|  - 医学体征极值拦截 / 5秒SOS防撤销红线 / 15秒跌倒超时自动升级 / 服药打卡幂等防呆 / 越权防御|
+---------------------------------------------------------------------------------------+
                                           ▲
+---------------------------------------------------------------------------------------+
|  Tier 1: Category-Partition (核心功能等价类全覆盖)                                    |
|  - 居家健康监测 (Health) / SOS紧急呼救 (SOS) / 用药提醒 (Med) / 守护互助 (Mutual Aid) |
|  - 4 大主线每特性 ≥ 5 个独立测试用例                                                  |
+---------------------------------------------------------------------------------------+
```

### 3.1 Tier 1: Category-Partition (核心功能等价类全覆盖)
依据功能规格划分输入域，确保 4 大刚需业务主线每主线包含 ≥5 个独立测试用例：
1. **居家健康监测 (Health - 对应 Feature #5)**：
   - 今日健康概览快照（血压、心率、异常提醒）
   - 体征历史趋势图谱（7天 / 30天周期多维数据拉取）
   - 手动录入血压记录（自动触发高压/低压阈值判定）
   - 手动录入心率记录（自动触发心动过速/过缓分析）
   - 智能健康设备绑定、列表检索与主设备设定
2. **SOS紧急呼救 (SOS - 对应 Feature #6)**：
   - 一键紧急呼救触发（GPS定位、家庭住址、时序记账）
   - 5秒防误触冷静期撤销（状态置为 cancelled 并记录流水）
   - 智能手环跌倒加速度冲击上报（判定进入 detecting 状态与倒计时）
   - 15秒倒计时内长辈主动误报解除（状态置为 cancelled）
   - 求救历史记录分页查询与求救事件全维度明细
3. **用药提醒 (Medication - 对应 Feature #7)**：
   - 用药计划编排与创建（药品名称、规格剂量、服药时段、剩余药量）
   - 今日待服时间轴清单拉取（待服 pending 与已服 taken 状态分组）
   - 按时服药确认打卡（状态跃迁为 taken，扣减计划库存）
   - 长辈身体不适跳过打卡（状态跃迁为 skipped）
   - 月度服药日历遵从率视图（每日应服、实服、跳过统计）
4. **守护互助 (Mutual Aid - 对应 Feature #8)**：
   - 家属端长辈全景看板（长辈档案、体征概览、用药进度、活跃预警）
   - 家属推送偏好动态配置（健康预警、服药提醒、SOS紧急推送开关）
   - 志愿者个人档案与服务星级查询
   - 助老关爱工单认领接单（状态置为 assigned）
   - 志愿者上门服务签到与签退打卡（生成工单签到签退时间戳）

### 3.2 Tier 2: Boundary Value Analysis (BVA 边界值与极值异常防御)
针对系统的极端输入、状态窗口竞争、重试防呆与权限边界进行硬性压测，每特性提供 ≥5 个边界用例：
1. **医学极值与非法输入防御**：
   - 缺失必需字段 `metric_type` 拦截（400 状态码与结构化报错）
   - 录入系统不支持的非法指标类型拦截（400 状态码）
   - 录入空值 `value` 拦截（400 状态码）
   - 设备绑定时超出 0-100 范围的极端电量（如 120 或 -10）拦截（400 状态码）
   - 极端高血压（如收缩压 300 / 舒张压 160）录入成功但强制触发严重预警标记
2. **SOS 5秒防误触窗口期硬拦截**：
   - 超出 5 秒冷静期的紧急呼救撤销请求强制拦截（返回 408 CANCEL_TIMEOUT）
   - 非法或不存在的 event_id 撤销拦截（400 / 404 状态码）
   - 已结案或已确认的事件重复发起撤销拦截（409 状态冲突）
3. **跌倒倒计时超时自动升级流水**：
   - 跌倒检测倒计时超过 15 秒未解除时，触发后台自动结算为 `confirmed`
   - 自动生成紧急联系人家属微信与短信通知记账记录
   - 写入 `eventTimelineService` 毫秒级复盘事件链（`fall.confirmed`）
4. **服药确认高频重复点击幂等防呆**：
   - 模拟老人抖动或手滑短时间内连续发起 3 次服药确认
   - 首次确认成功更新并扣减库存（`idempotent: false`）
   - 后续重复点击安全返回幂等成功（`idempotent: true`），库存严格不扣减第二次
   - 非法 `log_id` 与非法状态枚举（非 taken/skipped）拦截（400 状态码）
5. **志愿者跨区域越权接单与无权限打卡防御**：
   - 普通长辈账号越权访问志愿者接口拦截（403 Volunteer access denied）
   - 志愿者认领已被他人抢单的工单拦截（409 冲突防御）
   - 志愿者对非 assigned 状态工单进行签到打卡拦截（409 状态不匹配）
   - 志愿者跨辖区接单边界隔离校验

### 3.3 Tier 3: Pairwise Testing (跨系统正交组合联动流)
聚焦系统微服务/子模块间的横向通信契约，验证端到端状态流转在多模块间的因果传递：
1. **联动流 1：SOS 险情触发 -> 时序流水 -> 社区管理屏联动 -> 志愿者响应**
   - 老人端触发 SOS 呼救 -> 自动向审计中心写入 `sos.triggered` 时序事件；
   - 社区管理屏（`/admin/sos/events` 与 `/admin/system/event-replay`）实时出现该待处理呼救；
   - 社区网格员在大屏确认险情 -> 触发派遣志愿者助老任务。
2. **联动流 2：用药计划生成 -> 今日时间轴超时未服 -> 守护全景视图实时预警**
   - 制定每日 08:00 服药计划 -> 今日时间轴生成待服记录；
   - 服药超时未完成打卡 -> 家属端拉取 `/family/elderly-overview` 时，`alerts` 列表自动实时聚合出现用药超时预警。
3. **联动流 3：志愿助老全流程闭环**
   - 任务认领（pending -> assigned） -> 现场签到打卡（assigned -> processing） -> 服务完成签退（processing -> completed） -> 触发时间银行（TimeBank）时间币（TimeCoins）结算与加密哈希存证（recordHash / prevHash 链式沉淀）。

### 3.4 Tier 4: Workload & Persona Testing (真实长辈适老业务场景测试)
模拟真实世界中老年长辈使用银伴系统的一天，编排 5 大复合多步端到端业务剧本：
1. **剧本 1: 独居长辈清晨日常 (Morning Routine)**
   - 早晨 07:00 长辈醒来测量血压（148/95 mmHg） -> 数据录入触发血压偏高预警；
   - 08:00 系统自动推送降压药提醒（硝苯地平控释片 30mg） -> 长辈查看今日待服时间轴；
   - 长辈温水送服后在小程序点击“我已服药” -> 药量库存扣减，打卡记录计入健康台账。
2. **剧本 2: 夜间突发险情紧急救援闭环 (Midnight Emergency Rescue)**
   - 凌晨 02:15 长辈突发心绞痛按下 SOS 大红按键 -> 上传精准定位与家庭地址；
   - 系统生成毫秒级时序存证并启动紧急通知队列 -> 写入全局事件复盘链；
   - 社区值班大屏收到告警弹窗 -> 社区响应转为 confirmed -> 协同送医后管理员标记结案 resolved。
3. **剧本 3: 跌倒防误触自愈全流程 (Fall False-Alarm Self-Healing)**
   - 长辈手环在做家务时剧烈挥动，加速度传感器触发疑似跌倒告警；
   - 系统进入 15 秒声光倒计时冷静期；
   - 长辈在屏幕上点击“我没有摔倒，取消报警” -> 系统在第 6 秒成功取消；
   - 系统生成 `fall.cancelled` 事件并恢复安全常态，不打扰家属与 120 绿色通道。
4. **剧本 4: 志愿者爱心助老上门陪伴 (Volunteer Home Care Escort)**
   - 社区发布“独居高龄老人上门谈心与打扫”任务 -> 志愿者通过移动端认领工单；
   - 志愿者到达老人家中，出示二维码完成现场签到打卡；
   - 完成 2 小时贴心陪伴后，长辈满意确认，志愿者点击完成签退；
   - 系统结算 2 枚时间币存入志愿者账户，记录不可篡改的流水哈希链。
5. **剧本 5: 慢病长辈月度就医体征全景报告聚合 (Monthly Medical Snapshot)**
   - 长辈前往医院复诊前，家属打开全景守护界面；
   - 汇总拉取过去 30 天收缩压/舒张压波动趋势图谱；
   - 聚合拉取本月用药依从日历（出勤率与未按时服药分布）；
   - 生成结构化就诊体征报告，协助临床医生评估降压药调方效果。

---

## 四、特性清册与测试映射矩阵 (Feature Inventory Matrix)

对标 `PROJECT.md` 特性清册，各 E2E 测试文件的覆盖映射如下：

| # | 覆盖特性名称 | PROJECT.md 编号 | 对应 E2E 测试套件路径 | 覆盖接口契约 (Endpoints) | 关键断言与验收准则 |
|---|---|---|---|---|---|
| 1 | 居家健康监测主线全覆盖 | Feature #5 | `backend/tests/e2e/tier1_health.test.js` | `GET /health/today`<br>`GET /health/trend`<br>`POST /health/manual`<br>`GET /device/list`<br>`POST /device/bind` | 统一响应 `{code: 0}`，血压阈值判定、心率异常归集、7d/30d趋势结构、设备绑定校验 |
| 2 | SOS紧急呼救与跌倒检测 | Feature #6 | `backend/tests/e2e/tier1_sos.test.js` | `POST /sos/trigger`<br>`POST /sos/cancel`<br>`POST /fall-detection/report`<br>`POST /fall-detection/cancel`<br>`GET /sos/history` | 5秒内正常撤销、15秒跌倒冷静期撤销、GPS定位存储、历史分页、单条详情 |
| 3 | 用药提醒慢病管家全覆盖 | Feature #7 | `backend/tests/e2e/tier1_medication.test.js` | `POST /medication/plans`<br>`GET /medication/today`<br>`POST /medication/confirm`<br>`GET /medication/history/calendar` | 计划新增与列表、今日时间轴待服清单、服药打卡扣库存、跳过打卡、月度日历遵从率 |
| 4 | 守护互助与志愿服务全覆盖 | Feature #8 | `backend/tests/e2e/tier1_mutual_aid.test.js` | `GET /family/elderly-overview`<br>`GET /family/settings`<br>`GET /volunteer/tasks`<br>`POST /volunteer/tasks/:id/accept`<br>`POST /volunteer/tasks/:id/check-in` | 家属多维看板聚合、家属推送偏好更新、志愿者接单流转、服务现场打卡与签退 |
| 5 | 边界与极值异常深度防御 | Feature #18 (Tier 2) | `backend/tests/e2e/tier2_boundary.test.js` | 各主线变更与入参接口 | 400医学极值过滤、408超5秒SOS防撤销、15秒跌倒超时自动确认、服药幂等防呆、403越权防护 |
| 6 | 跨系统正交组合联动流 | Feature #18 (Tier 3) | `backend/tests/e2e/tier3_pairwise.test.js` | `/sos/*`<br>`/admin/sos/*`<br>`/admin/system/*`<br>`/medication/*`<br>`/family/*`<br>`/volunteer/*` | SOS-大屏-工单联动、用药超时-家属预警联动、认领-签到-签退-TimeBank工时哈希存证闭环 |
| 7 | 真实长辈适老业务场景 | Feature #18 (Tier 4) | `backend/tests/e2e/tier4_scenarios.test.js` | 全局 4 大主线跨接口编排 | 独居长辈清晨日常、夜间急救、手环跌倒自愈、爱心上门陪伴、复诊就医体征报告聚合 |

---

## 五、测试执行规范与持续集成门禁

1. **零外部配置开箱即用**：
   测试套件内部完成全部环境自洽初始化，不需要手动部署 MySQL 或 Redis 即可启动。
2. **高保真契约校验**：
   测试断言覆盖 HTTP 状态码、响应体顶层字段格式、业务对象类型及内部属性字段名称，全面对标 `PROJECT.md` 规范。
3. **测试就绪报告产出**：
   在全量测试通过后，自动化统计测试用例数并生成发布 `TEST_READY.md`，作为后续里程碑 M4/M5 司法验收的唯一基准。
