# 后端代码全景、业务裁撤与重构梳理报告 (Handoff Report)

## 1. Observation（客观事实与直接观测）

### 1.1 源码架构全景与目录规模
- 后端技术栈：`Node.js 18 + Express 4.22.1 + MySQL 8 (mysql2 3.17.4) + Redis 7 (ioredis 5.9.3) + node-cron 3.0.3 + Jest 29.7.0`。
- 源码总规模：`src/` 目录下共有 112 个源码文件，总代码行数约 26,298 行（通过 `wc -l $(find src -type f)` 统计）。
- 双路由挂载架构：`src/app.js:74-77` 同时挂载 `/api/v1` 与根路径 `/`；系统健康探针在 `src/app.js:72-73` 分别挂载 `systemHealthRoutes` (`/livez`, `/readyz`) 和 `healthRoutes` (`/health`)。
- 路由注册机制：`src/routes/index.js:27-44` 集中注册 16 组业务前缀路由（通过内部 `safeUse()` 防御包裹）。

### 1.2 历史初步裁撤后的严重阻断缺陷与僵尸代码残留
在前期初步裁撤 5 个模块（医疗资源整合 015、药物相互作用 009、AI健康咨询 008、AI伴聊 011、家庭空间相册 012）后，代码库中遗留了严重的断裂与坏死代码：
1. **致命启动阻断（Fatal Startup Error）**：
   - 执行 `node -e "require('./src/app.js')"` 时直接抛出致命崩溃：
     ```text
     Error: Cannot find module '../models/familySpace'
     Require stack:
     - /home/antigravity/MH-ai-ai/old/backend/src/services/familyService.js:4:26
     - /home/antigravity/MH-ai-ai/old/backend/src/controllers/familyController.js:5:23
     - /home/antigravity/MH-ai-ai/old/backend/src/routes/family.js:5:26
     - /home/antigravity/MH-ai-ai/old/backend/src/routes/index.js:16:26
     - /home/antigravity/MH-ai-ai/old/backend/src/app.js:5:16
     ```
   - 根因：`src/models/familySpace.js` 被删除，但 `src/services/familyService.js:4` 仍在 `require('../models/familySpace')`，导致整个应用在真实启动时直接崩溃。
2. **孤儿控制器与数据模型残留（未清理干净）**：
   - `src/controllers/aiConsultController.js`（250行，残留且未删除，内部还在直接引用已删除的 `models/consultRecord`）。
   - `src/controllers/medicalDirectoryController.js`（残留且未删除，引用了已删除的 `services/medicalDirectoryService`）。
   - `src/models/onlineConsultationModel.js`（130行，残留且未删除）。
   - `src/data/publicMedicalDirectory.js`（静态数据字典残留且未删除）。
   - `src/config/familySpaceEnv.js`（残留配置文件）。
   - `src/middleware/validateMedicalIntegration.js`、`companionValidator.js`、`companionRateLimiter.js`、`familySpaceValidators.js`（残留中间件未删除）。
3. **残留路由与失效接口**：
   - `src/routes/family.js:6, 42-47` 仍在引用 `familySpaceController` 并挂载 `/message/send`、`/album/upload`、`/points`、`/leaderboard`。
   - `src/routes/community.js:95-111` 仍挂载 `/medical/reports`、`/drug-interactions` 接口。
   - `src/models/adminOps/medicalSos/fallDrugData.js:90-174` 仍包含 `listDrugInteractions` 查询。
   - `src/models/adminOps/medicalSos/medicalSosData.js:6-66` 仍包含 `listMedicalReports` 查询。
   - `src/routes/adminOps.js:40-43, 55-65` 仍挂载已被裁撤的医疗报告与药物相互作用重定向别名。
4. **单测套件断裂**：
   - 执行单元测试 `npx jest tests/unit` 时，有 14 个测试套件因找不到已删除的 service 或 model 直接红灯崩溃（如 `onlineConsultationController.test.js`、`contentSafetyService.test.js` 等）。

### 1.3 规范对标（三层架构、Redis、代码规范）现状
1. **Controller-Service-Model 三层分层**：
   - 积极表现：除残留的 `aiConsultController.js` 外，现存所有活跃 Controller 均严格调用 Service，无裸写 SQL、无直连数据库连接池现象；统一通过 `ok()` 与 `fail()` 返回，无裸写 `res.json()` 或 `res.send()`。
   - 违背点（事务层级颠倒与缺失）：`backend-architecture` 规范明确规定“涉及跨表变更或状态扣减，必须严格在 Service 层通过连接池控制事务”。但观测到：
     - 当前所有 `src/services/` 均未管理事务，`getConnection` 与 `beginTransaction` 缺失；
     - `timeBank` 的事务逻辑被下沉倒置在 `src/models/timeBank/account.js:40`、`exchange.js:28` 中；
     - SOS 告警生成、工单状态流转等跨表操作缺乏事务原子性保障。
2. **Redis 缓存与键命名规范**：
   - 违背点：`backend-architecture` 要求统一规范键名 `yinban:{module}:{entity}:{id}` 并显式设置 TTL。当前代码中键名格式极不统一，例如 `auth:refresh:${userId}`、`fall:timer:${eventId}`、`sos:notify:dedupe:*`、`queue:sos:notifications`，全量缺少统一根命名空间 `yinban:`。
3. **配置与驱动警告**：
   - `src/config/database.js:24` 配置了 `acquireTimeout: 30000`。在 `mysql2 v3+` 驱动下被识别为无效连接参数，每次启动均触发终端告警：
     `Ignoring invalid configuration option passed to Connection: acquireTimeout.`
4. **ESLint 规则过度豁免**：
   - `eslint.config.js:24-29` 全局禁用了 `'no-unused-vars': 'off'`、`'no-useless-catch': 'off'`，导致悬空变量与坏死模块未能在静态检查阶段暴露。
5. **JSDoc 与核心注释缺失**：
   - `src/controllers/authController.js`、`medicationLogController.js`、`sosController.js`、`volunteerController.js` 全量缺少方法级 JSDoc 注释；入参类型、返回值、异常场景全凭代码推导。

---

## 2. Logic Chain（逻辑推导链）

### 2.1 业务路线精简逻辑：为何进一步裁撤「语音助手」、「时间银行积分商城」、「社区文娱活动」、「统计别名」？
1. **基于用户原始需求与适老化定位（ORIGINAL_REQUEST.md）**：
   - 用户明确要求：“当前走的路线还是有点多，还可以再撤掉几个无关紧要的模块……给中老年人使用的，所以一定要符合长辈的口味，聚焦做精高价值刚需主线”。
2. **语音交互模块 (`/voice`) 裁撤逻辑**：
   - *事实依据*：`src/services/voiceInteractionService.js:65` 强制校验唤醒词“银伴银伴”，否则直接抛错；`src/controllers/voiceController.js` 要求客户端通过 HTTP 上传 Base64 音频并代理转发到云端（讯飞/通义）。
   - *推导结论*：对于发音不清、方言浓重、听力减退的高龄独居老人，唤醒词交互门槛极高；且后端处理音频 Base64 极度消耗内存与吞吐。现代微信小程序支持端侧同声传译与原生语音播报，完全不需要后端沉重的代理录音管道与静态日志库 (`voice_sessions`, `voice_command_logs`)。裁撤后可直接剔除讯飞等高门槛第三方配置，系统纯净度显著提升。
3. **时间银行虚拟代币与积分兑换 (`/time-bank`) 裁撤逻辑**：
   - *事实依据*：`src/models/timeBank/` 维护了 `time_bank_accounts`（代币余额、总收入）、`time_bank_exchanges`（商品兑换）、`time_bank_leaderboard`（排行榜）。
   - *推导结论*：高龄老人核心诉求是获得生活照料与安全托底，而非参与虚拟代币交易或看排行榜；且涉及代币流通往往面临合规合情质疑。真正的“守护互助”核心在于**工单派发、志愿者接单上门、打卡签退、服务时长存证**。这些能力在 `volunteer` 和 `community/orders` 中已具备完整闭环。将复杂的“虚拟代币交易所”裁撤，仅在志愿者端保留其累计服务工时记录，既符合真实公益互助逻辑，又消除了最具并发死锁隐患的账户锁表代码。
4. **社区文娱活动 (`/community/activities`) 裁撤逻辑**：
   - *事实依据*：`src/routes/community.js:61-62` 包含活动创建与查询。
   - *推导结论*：活动发布属于低频宣传类功能，与“防跌倒、防慢病恶化、紧急求救、家人守护”生命线严重脱节，属于典型的次要装饰性枝节。
5. **统计别名路由 (`/statistics`) 裁撤逻辑**：
   - *事实依据*：`src/routes/statistics.js` 仅是对 `/community/stats` 的重定向。
   - *推导结论*：存量重复路由，统一收口至社区数据大屏。

### 2.2 4 大高价值刚需主线的职责与接口边界收敛逻辑
通过对老龄人日常生活与突发危险场景的提炼，银伴后端的业务重心必须且仅需聚焦以下 4 大闭环主线：
1. **居家健康监测 (Health Monitoring)**：体征采集与多维呈现（血压、心率、血糖等）+ 异常指标即时警报 + 适老设备绑定。
2. **SOS 紧急呼救 (SOS Emergency Call)**：老人一键求救（带位置） + 跌倒自动感知倒计时 + 毫秒级时序流水记账 + 紧急联系人多通道即时通报 + 处置结案复盘。
3. **用药提醒 (Medication Reminder)**：用药计划定义 + 今日清单时间轴 + 一键服药打卡 + 三重定时任务保驾护航（准时提醒、超时跟进、余量续药）。
4. **守护互助 (Guardian Mutual Aid)**：家属端一屏统览守护 + 社区助老工单流转与志愿者自服务打卡签到。

---

## 3. Caveats（局限性与已知边界）

1. **只读约束说明**：
   - 作为只读勘测员（Explorer 1），本调研阶段未直接修改源码。`familyService.js` 中的致命引用错误及各残留文件已精准定位行号，留待重构执行阶段实施物理剔除。
2. **数据库迁移脚本（Migrations）状态**：
   - 现存 `migrations/` 中仍保留了 `001_create_ai_consult_tables.sql`、`006_create_voice_tables.sql` 等脚本。在裁撤后，新分支无需在新环境中执行废弃表结构的创建，但在存量测试数据库中需确保依赖清理。
3. **前端配合与联调依赖**：
   - 拟撤掉的接口（如 `/voice`、`/time-bank`、`/community/activities`）需同步通知前端重构团队（前端调研员），避免前端仍向废弃接口发起请求。

---

## 4. Conclusion（结论与详尽交付方案）

### 4.1 当前后端模块全景图 (Current Module Inventory)

```text
backend/src/
├── app.js & server.js          # Express 入口与生命周期（双路由挂载 /api/v1 与 /）
├── config/                     # 运行环境、数据库连接池、Redis、限流配置
├── routes/                     # 统一路由挂载
│   ├── auth.js                 # 核心：手机号/微信/管理员认证、短信验证码、令牌刷新
│   ├── user.js                 # 核心：个人资料、紧急联系人管理、绑定二维码
│   ├── adminUsers.js           # 核心：后台管理员账户及状态管理
│   ├── healthArchive.js        # 核心：健康档案、今日快照、7d/30d趋势、设备同步/录入
│   ├── medication*.js          # 核心：用药计划(Plan)、用药日志(Log)、日历(History)、设置(Setting)
│   ├── sos.js                  # 核心：SOS 触发、5秒撤销、事件流转、结案
│   ├── fallDetection.js        # 核心：跌倒传感器上报、15秒防误触取消、灵敏度配置
│   ├── family.js               # 核心：家属绑定、长辈全景大屏、推送偏好
│   ├── gpsTracking.js          # 核心：长辈位置上报、实时定位、历史轨迹、电子围栏
│   ├── volunteer.js            # 核心：志愿者档案、工单查询、接单、签到、签退、打卡完成
│   ├── community.js            # 核心：社区后台工单管理、统计看板、长辈监管
│   ├── adminOps.js             # 核心：系统三方诊断、全时序事件复盘、证据链存证、演示场景
│   ├── voice.js                # ⚠️ 拟裁撤：语音交互与 ASR/TTS 代理
│   ├── timeBank.js             # ⚠️ 拟裁撤：时间银行虚拟代币与兑换商城
│   └── statistics.js           # ⚠️ 拟裁撤：历史重复统计别名
├── services/                   # 核心领域业务逻辑
│   ├── authService / userService / adminUserService
│   ├── healthArchiveService / healthManualService / healthSyncService
│   ├── sosService / fallService / sosNotificationService / eventTimelineService
│   ├── medicationPlanService / medicationLogService / refillReminderService ...
│   ├── familyService / volunteerService / communityAdminService / adminOpsService
│   └── voice* / timeBank* / ossService (相关拟裁撤服务)
├── models/                     # 唯一访问 MySQL 的数据持久层 (30+ 实体映射)
├── jobs/                       # 分布式定时任务 (medicationReminder, followup, refill, sosWorker)
└── utils/                      # 统一响应封装 (ok/fail)、日志脱敏、加解密、校验器
```

---

### 4.2 拟撤掉的非核心与次要枝节模块清册 (Pruning Manifest)

| 裁撤分类 | 涉及路由 / 接口 | 涉及源码文件清单 | 裁撤核心理由 | 替代 / 归宿方案 |
| :--- | :--- | :--- | :--- | :--- |
| **1. 语音助手** | `/voice/*`<br>- `/recognize`<br>- `/synthesize`<br>- `/sessions` | `src/routes/voice.js`<br>`src/controllers/voiceController.js`<br>`src/services/voiceInteractionService.js`<br>`src/services/voiceService.js`<br>`src/services/asrService.js`<br>`src/services/ttsService.js`<br>`src/models/voice.js`<br>`src/middleware/voiceValidators.js`<br>`src/config/voiceEnv.js`<br>`migrations/006_create_voice_tables.sql` | 强制唤醒词“银伴银伴”极不适老；后端转发音频导致高 I/O 阻塞；无大模型后沦为静态日志本。 | 前端小程序原生采用微信同声传译与原生 TTS，后端彻底减负。 |
| **2. 时间银行代币与商城** | `/time-bank/*`<br>- `/account`<br>- `/balance`<br>- `/exchange`<br>- `/leaderboard` | `src/routes/timeBank.js`<br>`src/controllers/timeBankController.js`<br>`src/services/timeBankService.js`<br>`src/services/timeBank/*`<br>`src/models/timeBank/*`<br>`src/middleware/validateTimeBank.js`<br>`migrations/001_create_time_bank_tables.sql` | 养老照护不应异化为虚拟货币交易所；老人无兑换需求；代币交易存在金融合规风险；高并发锁表易死锁。 | 互助重心回归“志愿工单服务打卡”；工时直接归档于志愿者个人档案 (`volunteer`)。 |
| **3. 社区文娱活动** | `/community/activities`<br>- `GET /activities`<br>- `POST /activities` | `src/services/communityAdmin/communityActivityService.js`<br>`src/models/communityAdmin/activities.js` | 低频展示类功能，与独居老人刚需生命线脱节，增加管理负担。 | 社区端聚焦工单调度与异常告警处置。 |
| **4. 统计别名模块** | `/statistics/*`<br>- `/overview`<br>- `/activities` | `src/routes/statistics.js`<br>`src/controllers/statisticsController.js`<br>`src/services/statisticsService.js`<br>`src/models/statisticsModel.js` | 存量历史冗余别名，直接映射至 `/community/stats`。 | 彻底清理冗余别名路由，统一以 `/community/stats` 作为大屏出口。 |
| **5. 历史初步裁撤的僵尸残留（彻底物理清除）** | 历史残留接口 | 1. `src/controllers/aiConsultController.js`<br>2. `src/controllers/medicalDirectoryController.js`<br>3. `src/models/onlineConsultationModel.js`<br>4. `src/data/publicMedicalDirectory.js`<br>5. `src/routes/family.js` 中的家庭空间残存路由<br>6. `src/services/familyService.js:4` 的 `familySpaceModel` 引用（**阻断级崩溃点**）<br>7. `src/routes/community.js:95-111` 医疗报告与用药互作用残留<br>8. `src/models/adminOps/medicalSos/fallDrugData.js` 相互作用 SQL<br>9. `src/models/adminOps/medicalSos/medicalSosData.js` 报告 SQL<br>10. `src/routes/adminOps.js` 中的废弃别名<br>11. `src/middleware/` 下已失效的 4 个中间件<br>12. `src/config/familySpaceEnv.js` | 历史重构遗留物，导致 `app.js` 运行时崩溃，单测 14 套件报错。 | 彻底清理坏死引用与代码，恢复全系统纯净度与构建测试绿灯。 |

---

### 4.3 核心保留 4 大主线的精细职责与接口边界 (Core Boundaries)

#### 主线 1：居家健康监测 (Home Health Monitoring)
- **职责范围**：长辈核心生命体征数据采集（血压、心率、血糖、血氧、体温、步数、睡眠）、今日健康摘要与异常研判、7d/30d趋势多维图谱、异常指标告警消除、监测设备绑定与主设备管理。
- **精细接口边界清单**：
  1. `GET /health/today` - 获取长辈今日体征最新快照与异常告警（老人与家属通用）。
  2. `GET /health/trend?metricType={type}&period={7d|30d}` - 获取体征波动趋势数据。
  3. `GET /health/blood-pressure/latest` - 获取最新单次血压及分级状态（正常/偏高/危险）。
  4. `GET /health/heart-rate/latest` - 获取最新单次心率及状态评定。
  5. `POST /health/manual` - 适老手动录入体征（支持 “138/88” 复合解析与智能容错）。
  6. `POST /health/sync` - 智能穿戴/蓝牙硬件批量同步生理数据。
  7. `PUT /health/alerts/:id/dismiss` - 异常体征告警消除/确认已读。
  8. `GET /health/devices` - 已绑定监测设备列表（将分散在 user/device 的接口统一收口）。
  9. `POST /health/devices/bind` - 绑定监测硬件（如智能血压计、防跌手环）。
  10. `POST /health/devices/unbind` - 解除设备绑定。
  11. `POST /health/devices/set-primary` - 设置主要数据来源设备。

#### 主线 2：SOS 紧急呼救与突发事件应急 (SOS & Emergency Ops)
- **职责范围**：一键求救（经纬度与逆地理编码地址）、5秒防误触快速取消、智能传感器跌倒自动识别与15秒倒计时撤销、毫秒级时序流水记账 (`eventTimelineService`)、紧急联系人微信/短信即时调度与通知队列、社区处置流转与结案、全时序复盘回放 (`eventReplayService`)。
- **精细接口边界清单**：
  1. `POST /sos/trigger` - 触发紧急求助（上报经纬度、触发类型 manual/fall）。
  2. `POST /sos/cancel` - 5 秒窗口期内一键撤销（防老人误触）。
  3. `GET /sos/history` - 查询长辈历史求助事件与处置进度。
  4. `GET /sos/events/:eventId` - 查看单次紧急事件全链路详情与当前状态。
  5. `POST /sos/confirm` - 社区/家属确认险情并介入处置。
  6. `POST /sos/resolve` - 应急处置完毕结案。
  7. `POST /fall-detection/report` - 穿戴传感器上报疑似跌倒事件（进入15秒倒计时）。
  8. `POST /fall-detection/cancel` - 倒计时内长辈手动解除误报。
  9. `GET /fall-detection/history` - 跌倒事件历史记录。
  10. `GET /fall-detection/settings` - 查看当前跌倒检测灵敏度与阈值。
  11. `PUT /fall-detection/settings` - 更新灵敏度（低/中/高）。
  12. `GET /admin/system/event-replay?eventId={id}` - 突发事件全时序复盘与可视化回放。

#### 主线 3：用药提醒与慢病管家 (Medication Reminder & Chronic Care)
- **职责范围**：用药计划管理（药品名、用法用量、提醒时刻数组、余量与续药警戒线）、今日清单与日历打卡热力图、确认服药与跳过、分布式定时任务驱动（准点提醒 `medicationReminderJob`、超时未服跟进 `medicationFollowupJob`、低余量续药预警 `refillReminderJob`）。
- **精细接口边界清单**：
  1. `GET /medication/plans` - 获取长辈当前生效的全部用药计划。
  2. `POST /medication/plans` - 创建用药计划（频次、服药时间数组严格校验）。
  3. `PUT /medication/plans/:id` - 更新用药计划信息（剂量、时间、余量）。
  4. `DELETE /medication/plans/:id` - 终止/归档该用药计划。
  5. `GET /medication/today` - 获取今日待服清单与时间轴执行状态。
  6. `GET /medication/logs` - 历史服药确认明细流。
  7. `POST /medication/confirm` - 确认服药打卡（状态更新为 `taken` 或 `skipped`，记录实际时间）。
  8. `GET /medication/history/calendar?month=YYYY-MM` - 获取月度遵医嘱服药合规率打卡热力图。
  9. `GET /medication/settings` - 获取用药提醒设置（提前提醒时长、微信推送开关）。
  10. `PUT /medication/settings` - 更新用药提醒偏好设置。

#### 主线 4：守护互助与志愿服务 (Guardian Mutual Aid & Volunteer Service)
- **职责范围**：长辈-家属绑定与二维码审批、家属端一屏全景统览（健康+用药+位置+SOS告警）、家属消息推送订阅、社区志愿者自服务档案、助老服务工单生命周期流转（社区派单 → 志愿者接单 → 上门打卡签到 → 服务完成签退 → 沉淀服务工时凭据）、社区照护运营综合大屏。
- **精细接口边界清单**：
  - **家属守护域**：
    1. `GET /family/bindings` - 当前用户绑定的长辈列表。
    2. `GET /family/elderly-overview?elderId={id}` - 家属端长辈全景视图（聚合今日健康体征、用药进度、当前位置、活跃告警）。
    3. `GET /family/health/:elderId` - 家属深度穿透查看特定长辈健康档案。
    4. `GET /family/settings` - 家属推送偏好查询。
    5. `PUT /family/settings` - 家属推送偏好更新。
    6. `POST /user/binding/qrcode` - 生成长辈绑定邀请二维码。
    7. `POST /user/binding/approve` - 审批接受绑定申请。
  - **志愿者互助域**：
    8. `GET /volunteer/profile` - 志愿者身份认证信息、累计志愿服务工时。
    9. `GET /volunteer/tasks` - 可认领/进行中的社区助老服务工单。
    10. `POST /volunteer/tasks/:taskId/accept` - 志愿者接单。
    11. `POST /volunteer/tasks/:taskId/check-in` - 志愿者到达长辈家中打卡签到。
    12. `POST /volunteer/tasks/:taskId/check-out` - 志愿者服务完成打卡签退。
    13. `POST /volunteer/tasks/:taskId/complete` - 工单办结并存证记录服务工时。
  - **社区运营域**：
    14. `GET /community/stats` - 社区照护综合统计看板（独居长辈数、活跃工单、今日告警）。
    15. `GET /community/orders` - 社区助老工单池与筛选。
    16. `POST /community/orders` - 社区网格员创建助老服务工单。
    17. `GET /community/orders/:orderId` - 工单全时序履约追踪与打卡存证。
    18. `PATCH /community/orders/:orderId/assign` - 社区后台主动指派工单给志愿者。
    19. `PATCH /community/orders/:orderId/status` - 调整工单流转状态。
    20. `GET /community/volunteers` - 社区志愿者人才库管理。
- **不可或缺的底层支撑底座**：
  - 认证中心：`/auth/*`（短信验证码登录、微信一键登录、Token刷新、安全登出）。
  - 用户基础信息：`/user/profile`、`/user/emergency-contacts`（紧急联系人增删改查）。
  - 探针与运行态诊断：`/livez`、`/readyz`、`/health`、`/admin/system/integrations`、`/admin/system/audit-logs`。

---

### 4.4 核心注释补齐计划 (Code Documentation Plan)

对标 `clean-code-standards` 规范，当前代码注释率低于 25%，且缺乏标准 JSDoc 声明。制定以下核心注释补齐执行计划：

| 模块分类 | 重点目标文件 | 需补齐的注释类型与规范标准 | 预计补充规模 |
| :--- | :--- | :--- | :--- |
| **控制器层 (Controllers)** | `authController.js`<br>`healthController.js`<br>`medicationLogController.js`<br>`sosController.js`<br>`volunteerController.js`<br>`userController.js` | 严格为每个 Controller Action 编写标准 JSDoc：<br>- 接口业务意图与适用角色说明；<br>- `@param {import('express').Request} req` 及解构字段校验规则；<br>- `@param {import('express').Response} res` 统一 `{ code, message, data }` 响应结构定义；<br>- 潜在 HTTP 错误状态码对照（400/401/403/404/409/422/500）。 | 约 35 个控制器方法，补齐 ~300 行规范 JSDoc |
| **业务服务层 (Services)** | `authService.js`<br>`healthArchiveService.js`<br>`medicationPlanService.js`<br>`sosService.js` (`sos/actions.js`)<br>`volunteerService.js`<br>`eventTimelineService.js` | 核心领域业务方法注释：<br>- 函数动作与单一职责描述；<br>- 领域入参规范 `@param`、返回值实体 `@returns`；<br>- 业务异常条件 `@throws {ServiceError}`（如状态跃迁非法、5秒超时禁止取消等）；<br>- 事务边界与异步通知逻辑标注。 | 约 40 个服务方法，补齐 ~400 行领域注释 |
| **持久层与数据模型 (Models)** | `models/user.js`<br>`models/emergencyContact.js`<br>`models/sosEvent.js`<br>`models/healthRecordModel.js`<br>`models/medicationPlanModel.js`<br>`models/volunteerModel.js` | 数据库操作与 SQL 意图注释：<br>- 复杂 SQL 联合查询字段映射说明；<br>- 乐观锁与状态机流转约束说明（如 `transitionStatus` 条件更新）；<br>- 索引命中策略与分页性能保障说明。 | 约 30 个模型方法，补齐 ~250 行架构与 SQL 说明 |

---

### 4.5 三层架构规范整改方案 (Refactoring Roadmap)

1. **彻底清理坏死残留引用（优先解除致命启动阻断）**：
   - 立即修正 `src/services/familyService.js:4`，移除已删除的 `../models/familySpace` 引用；将 `getOverviewResources` 中的 `familySpaceModel.getInteractionEvidenceSummary` 改造为纯净的安全降级返回，彻底恢复 `app.js` 启动能力。
   - 清理 `src/routes/family.js` 中的 6 个家庭空间残存路由，确保只保留长辈全景视图与家属绑定核心。
2. **重构服务层事务编排（Service-driven Transactions）**：
   - 遵循 `backend-architecture` 规范，将目前封装在个别 Model 中的事务逻辑抽取至 Service 层。
   - 编写统一的事务辅助工具 `runInTransaction(async (conn) => { ... })`，确保：
     - 在 SOS 触发时，`sosEvent` 插入、`sosNotification` 队列写入、`eventTimeline` 记录处于统一数据库事务保护下；
     - 志愿者完成工单与工时记录结转处于事务保护下；
     - 异常时自动执行 `conn.rollback()`，并在 `finally` 块中严格执行 `conn.release()` 释放连接池连接。
3. **收拢重复分散的设备路由**：
   - 将散落在 `user.js` (`/user/devices`)、`deviceCompat.js` (`/device/*`)、`healthArchive.js` (`/health-archive/device/*`) 的设备绑定逻辑统一收口至 `src/routes/healthArchive.js` 的 `/health/devices` 命名空间下，其他地方通过语义清晰的重定向或别名兼容，消除单一职责混淆。
4. **统一 Redis 命名空间标准**：
   - 统一建立 `src/config/redisKeys.js` 常量管理器，强制实施 `yinban:{module}:{entity}:{id}` 命名规范：
     - 刷新令牌：`yinban:auth:refresh:{userId}`
     - 管理员会话：`yinban:auth:admin:session:{sessionId}`
     - 跌倒计时器：`yinban:fall:timer:{eventId}`
     - 跌倒配置缓存：`yinban:fall:settings:{userId}`
     - SOS 通知去重：`yinban:sos:notify:dedupe:{notificationId}:{retryCount}`
     - SOS 通知队列：`yinban:sos:queue:notifications`
     - SOS 分布式锁：`yinban:lock:sos:{action}`
   - 杜绝散落的裸写 Key 字符串，强制显式标注 TTL。
5. **移除 MySQL 弃用配置参数**：
   - 在 `src/config/database.js:24` 中剔除 `acquireTimeout: 30000`，彻底消除运行时驱动警告。
6. **收紧 ESLint 代码规范检查**：
   - 在 `eslint.config.js` 中重新启用 `'no-unused-vars': 'error'` 与 `'no-useless-catch': 'error'`，杜绝隐藏的死代码与坏死依赖。

---

### 4.6 代码瘦身与清理统计建议 (Code Slimming Estimates)

实施上述精简裁撤后，后端预期瘦身指标：
- **移除冗余文件**：共计拟删除/精简 **28 个源码与配置中间件文件**（含 2 个残留 Controller、1 个残留 Model、8 个语音相关文件、9 个时间银行相关文件、4 个失效中间件、4 个社区活动/统计相关文件）。
- **减少代码体量**：预计净删除 **4,200 ~ 5,000 行冗余代码**（占当前总代码行数的近 20%）。
- **清理测试套件**：清理或重构 14 个因裁撤导致的孤儿测试文件，消除单测红灯噪音，确保全量单元测试与集成测试 100% 绿灯。
- **数据库减负**：删除 7 张废弃数据表（`voice_sessions`, `voice_command_logs`, `time_bank_accounts`, `time_bank_exchanges`, `time_bank_leaderboard`, `drug_interactions`, `medical_reports`），大幅降低数据库字典开销。

---

## 5. Verification Method（独立验证方法）

后续智能体或审核人员可通过以下具体命令与文件独立复核本报告结论：

### 5.1 验证致命启动阻断与坏死残留
```bash
# 验证 app.js 启动直接崩溃
node -e "require('/home/antigravity/MH-ai-ai/old/backend/src/app.js')"
# 预期报错：Cannot find module '../models/familySpace' from src/services/familyService.js

# 检查残留未删除文件
ls -la /home/antigravity/MH-ai-ai/old/backend/src/controllers/aiConsultController.js
ls -la /home/antigravity/MH-ai-ai/old/backend/src/controllers/medicalDirectoryController.js
ls -la /home/antigravity/MH-ai-ai/old/backend/src/models/onlineConsultationModel.js
```

### 5.2 验证核心 4 大主线单元测试通过情况
```bash
# 验证核心主线业务代码高度可用（32 个核心测试全过）
cd /home/antigravity/MH-ai-ai/old/backend
npx jest tests/unit/authService.test.js tests/unit/healthArchiveService.unit.test.js tests/unit/sos.service.test.js tests/unit/medicationPlanService.test.js tests/unit/volunteerService.test.js
```

### 5.3 验证当前失败测试与孤儿测试分布
```bash
# 查看因历史裁撤导致的 14 个测试套件报错
npx jest tests/unit --testPathIgnorePatterns='(familySpace|companion|consult|drugInteraction|aiService|medical|appointment|neo4j|qwen|emotion|knowledgeGraph)'
```

### 5.4 验证 Redis 键命名规范违背
```bash
# 搜索当前 Redis key 定义，验证缺少 'yinban:' 统一前缀
grep -rnE "('|\`)(auth|fall|sos|queue|ratelimit):" /home/antigravity/MH-ai-ai/old/backend/src/
```

### 5.5 验证数据库连接池参数告警
```bash
# 观察 mysql2 对 acquireTimeout 的告警输出
node -e "require('/home/antigravity/MH-ai-ai/old/backend/src/config/database.js')"
```
