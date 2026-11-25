---
name: backend-business-logic
description: 银伴智慧照护领域核心业务逻辑与运行态技能。涵盖统一 {code, message, data} 响应规范、第三方能力受控降级（Stub-Ready / Live-Ready）运行态诊断输出、突发事件时间线复盘（Event Timeline & Replay）、证据聚合链（Evidence）与分布式定时任务（node-cron）治理。
---

# 银伴核心业务逻辑与运行态规范 (Backend Business Logic)

本技能确立**银伴（SilverCompanion）全域照护平台核心业务逻辑、第三方运行态受控降级与事件复盘流**的最高工程标准。系统对真实生产凭据与模拟沙箱提供统一的无缝适配机制，确保演示、比赛答辩与实际部署间无感切换。

---

## 1. 统一响应规范与出口标准 (Unified Response Format)

后端所有接口（无论是正常返回还是捕获异常）**强制统一使用以下结构**：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": { ... }
}
```

### 1.1 核心规则
- **成功状态**：`code` 必须为整数 `0`，`message` 默认为 `"ok"` 或自定义成功文案。
- **失败状态**：`code` 取 HTTP 语义值（如 `400`、`401`、`403`、`404`、`409`、`422`、`429`、`500`、`503`）。
- **统一工具封装**：必须使用 `backend/src/utils/response.js` 导出的 `ok()` 与 `fail()`，**严禁直接使用 `res.json()` 裸写非标结构**：
  ```javascript
  const { ok, fail } = require('../utils/response');

  // 成功输出
  return ok(res, { recordId: 'REC_8829' }, '档案保存成功');

  // 错误输出
  return fail(res, 404, '指定的健康指标不存在');
  ```

---

## 2. 第三方能力受控降级与运行态诊断 (Provider Runtime & Stub-Ready)

银伴深度依赖多种三方外部能力（阿里云短信/OSS、阿里百炼大模型、科大讯飞语音、高德地图、第三方医院 HIS 系统）。系统采用**双态平滑切换架构**：

### 2.1 官方对外统一口径
- 项目对外统一表述为 **`stub-ready / live-ready`**（已具备生产接入能力，沙箱环境受控模拟运行）。
- 严禁将受控 Fallback 夸大宣称为“已全量商用的 Live 直连能力”。

### 2.2 统一运行态输出标准
任何涉及第三方能力的健康诊断接口（如 `/admin/system/integrations`），必须输出包含以下 6 大标准维度的诊断对象：

```typescript
interface ProviderRuntimeStatus {
  providerName: string;           // 服务商名称（如 AliyunSms, DashScope, iFlytek）
  requestedMode: 'LIVE' | 'STUB'; // 请求期望模式
  effectiveMode: 'LIVE' | 'STUB'; // 实际生效模式
  liveConfigured: boolean;        // 真实生产密钥是否已完备配置
  fallbackAllowed: boolean;       // 是否允许降级到受控本地存根
  lastError: string | null;       // 最近一次调用失败详情（无则为 null）
  lastSuccessAt: string | null;   // 最近一次调用成功 ISO 时间戳
}
```

### 2.3 降级执行模板
```javascript
// src/services/smsService.js 范例
async function sendVerificationCode(phone, code) {
  const runtime = getProviderRuntime('AliyunSms');

  if (runtime.effectiveMode === 'LIVE') {
    try {
      const liveResult = await aliyunClient.sendSms({ phone, code });
      runtime.recordSuccess();
      return { success: true, mode: 'LIVE', messageId: liveResult.bizId };
    } catch (err) {
      runtime.recordError(err.message);
      if (!runtime.fallbackAllowed) {
        throw new ExternalServiceError('短信网关发送失败且禁止降级');
      }
      logger.warn(`阿里云短信失败，受控降级为本地模拟存根: ${err.message}`);
    }
  }

  // 受控 Stub 存根模拟
  const stubResult = await mockSmsClient.send({ phone, code });
  return { success: true, mode: 'STUB', simulated: true };
}
```

---

## 3. 突发事件全时序复盘 (Event Timeline & Replay Service)

针对长者生命安全相关事件（**紧急 SOS、跌倒报警、电子围栏越界逃逸**），系统必须构建毫秒级全链路时间线，供社区后台进行全过程事件复盘（Replay）。

### 3.1 核心链路标准事件节点
1. `ALERT_TRIGGERED`：设备端或长者端触发（记录物理定位经纬度、传感器数值、电池电量）。
2. `CHANNELS_DISPATCHED`：并行推送至短信网关、微信模板消息、TTS 自动语音外呼。
3. `FAMILY_NOTIFIED`：家属端收到实时推送或短信确认。
4. `COMMUNITY_ASSIGNED`：社区值班人员接警，指派网格员/志愿者上门。
5. `VOLUNTEER_ARRIVED`：志愿者签到现场确认长者状况。
6. `INCIDENT_RESOLVED`：险情处置完毕，上传现场处置记录并解除报警。

### 3.2 接入范式
在核心业务方法中调用 `eventTimelineService.recordEvent()`：
```javascript
const eventTimelineService = require('./eventTimelineService');

await eventTimelineService.recordEvent({
  incidentId: alert.id,
  eventType: 'COMMUNITY_ASSIGNED',
  operatorId: adminUser.id,
  operatorRole: 'COMMUNITY_ADMIN',
  note: '已指派第一网格志愿者张建国上门查看',
  timestamp: new Date().toISOString()
});
```

---

## 4. 统一证据聚合链 (Evidence Aggregation)

在管理后台中展示各子系统的核心证据链条（`/admin/system/evidence`）：
- 医疗挂号证据：医院预约流水号、就诊卡号、排班时间哈希。
- 志愿工单证据：签到 GPS 坐标校验、签到人脸/照片存证、服务时长确认签名。
- 处方用药证据：处方医生工号、相互作用审查通过标识、确认服药时间戳。

---

## 5. 定时任务治理与防并发 (Cron Jobs)

定时任务集中存放在 `backend/src/jobs/` 中，使用 `node-cron` 调度：
1. **防重入与并发锁**：高频任务（如每分钟巡检用药提醒）必须在执行前获取 Redis 分布式排他锁（带 50 秒 TTL），防止前一次任务超时导致重复向老人拨打催服电话。
2. **任务执行监控**：每个任务开始与结束必须打印结构化耗时日志，记录 `jobName`、`scannedCount`、`processedCount`、`durationMs`。

---

## 6. 核心业务逻辑自查清单 (Business Logic Checklist)

- [ ] 是否所有接口响应均符合 `{ code, message, data }` 标准格式？
- [ ] 第三方依赖在缺失生产凭据时，是否能平滑且安全地走入受控存根（Stub-Ready）？
- [ ] 突发安全事件（SOS、跌倒）是否均向统一事件时间线写入了审计日志？
- [ ] 定时任务是否有防止多次并发执行的锁保护机制？
- [ ] 数据返回前端前，是否对敏感隐私数据执行了过滤脱敏？
