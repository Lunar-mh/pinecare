# 银伴后端竞赛级真实数据与接入指引

## 目标

这份文档服务于后端竞赛联调阶段，目标不是追求所有第三方能力都 fully live，而是让我们在资源有限的情况下，优先把真实业务数据、可解释 fallback、可切换 live 的后端底座做扎实。

## 竞赛数据底座

当前仓库已经补入统一数据基线清单 [competitionSeedManifest.js](/D:/03_Study/Desktop/old/backend/src/data/competitionSeedManifest.js)。建议竞赛演示至少覆盖：

- 3 个社区
- 36 位老人
- 24 位家属为最低说明目标，当前导出数据按 36 位家属一一绑定老人，便于演示链路稳定
- 14 位志愿者
- 30 天用药日志与 GPS 轨迹
- SOS 事件、服务工单、时间银行记录、医疗咨询、预约与报告样本

数据优先级固定为：

- 脱敏真实样本
- 公开可核验数据
- 高可信人工构造业务数据

一键基线输出脚本为 [seedCompetitionData.js](/D:/03_Study/Desktop/old/backend/scripts/seedCompetitionData.js)，当前会输出导入基线与执行顺序。正式 JSON 资产导出脚本为 [exportCompetitionSeed.js](/D:/03_Study/Desktop/old/backend/scripts/exportCompetitionSeed.js)，会把可导库的竞赛数据输出到 `backend/generated/competition-seed/`。

## 当前已生成的数据资产范围

数据生成逻辑已固化在 [competitionSeedDataset.js](/D:/03_Study/Desktop/old/backend/src/data/competitionSeedDataset.js)，当前覆盖：

- 社区、社区管理员、志愿者、老人、家属、家庭绑定
- 健康档案、用药计划、30 天用药日志
- 30 天 GPS 轨迹点
- SOS 事件
- 社区服务工单、志愿者签到、服务记录
- 时间银行账户与兑换记录
- 医疗咨询、预约、医疗报告
- 公开整理后的医院、科室、医生目录

## 医疗链路真实化策略

### 目录

医疗目录不再优先依赖幻想式 stub 列表，而是优先使用本地缓存和整理后的公开目录数据。当前公开目录数据在 [publicMedicalDirectory.js](/D:/03_Study/Desktop/old/backend/src/data/publicMedicalDirectory.js)。

### 咨询、预约、报告

后端现在统一返回这些诊断字段：

- `source`
- `mode`
- `fallbackUsed`
- `diagnosticId`
- `diagnostics`

竞赛阶段建议采用：

- 医疗目录尽量真实
- 在线咨询和预约保持严格契约壳层
- 医疗报告优先脱敏真实样本，其次使用半真实结构化样本

### 错误口径

- 缺少 live 配置：`503`
- 上游超时：`504`
- 上游限流或不可用：`503`
- 请求契约错误：`422`
- fallback 成功：HTTP 仍为成功，但必须在 `data.diagnostics` 中说明不是 live 结果

## 志愿者与时间银行闭环

志愿者任务完成后，后端必须自动完成这些动作：

- 服务工时计算
- 服务记录落库
- 时间币结算
- 审计留痕
- 排行榜缓存失效

当前这一闭环已经在 [volunteerService.js](/D:/03_Study/Desktop/old/backend/src/services/volunteerService.js) 固化，联调时应直接消费完成接口返回的 `settlement` 字段。

## 推荐导库顺序

1. `communities.json`
2. `users.json`
3. `family-bindings.json`
4. `health-archives.json`
5. `medication-plans.json`
6. `medication-logs.json`
7. `gps-tracks.json`
8. `sos-events.json`
9. `service-orders.json`
10. `volunteer-attendance-logs.json`
11. `service-records.json`
12. `time-bank-accounts.json`
13. `time-bank-exchanges.json`
14. `consultations.json`
15. `appointments.json`
16. `medical-reports.json`

## 第三方接入成本判断

### 微信订阅消息

- 需要小程序主体与订阅消息模板配置
- 真实发送通常需要已上线或具备可用主体
- 竞赛阶段如果拿不到主体，可保留审计与事件留痕，不要伪装成真实送达

### 阿里云短信

- 需要实名认证、签名、模板审核
- 有明确成本，适合在进入校赛或省赛后按需开通
- 若不开通，必须保留失败可解释性和后台审计证据

### OSS

- 成本相对较低
- 如果要演示上传、相册、报告附件，这一项优先级高于短信

### 医疗平台 API

- 正式 API 通常最难拿到，也可能最贵
- 竞赛阶段最优方案不是强行伪装 live，而是：真实目录 + 半真实报告 + 诊断清晰的咨询或预约壳层

## 推荐执行顺序

1. 先用竞赛数据基线完成 JSON 导出与 MySQL 导入。
2. 再验证 A/B/C/D/E 五条链路都能从数据库跑出可回放证据。
3. 再按资金情况逐步打开 OSS、短信、微信通知和医疗 live 接入。
4. 每打开一个 live 能力，都要保证不破坏既有 frozen contract。

## 导库与回放命令

- 生成竞赛基线说明：`npm run seed:competition`
- 导出 JSON 资产：`npm run seed:competition:export`
- 生成 MySQL 初始化 SQL：`npm run seed:competition:sql`
- SQL 文件输出位置：`backend/generated/competition-seed/bootstrap.sql`
- 导库说明输出位置：`backend/generated/competition-seed/bootstrap-readme.md`

如果后续要做答辩回放，建议先执行 SQL 导库，再调用 `POST /admin/system/demo/bootstrap` 获取 replay context 和审计证据。

- 如本地 MySQL 已完成迁移并配置好 `backend/.env`，可继续执行：`npm run seed:competition:apply`
- 如需先验证流程不落库，可执行：`node scripts/applyCompetitionSeed.js --dry-run`

- ???????????`npm run seed:competition:verify`

- ???????????`npm run seed:competition:snapshot`
- ?????? + ?? + ???`npm run seed:competition:refresh`
