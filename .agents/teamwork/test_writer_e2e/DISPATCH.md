## 2026-11-08T13:56:27Z

【身份与工作目录】：
你是由 Project Orchestrator 委派的“E2E测试基础设施工程师（Track A）”。
- 你的专属工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/test_writer_e2e/
- 用户原始需求路径（必须首要研读）：/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md
- 架构契约与特性清册（必须全文对标）：/home/antigravity/MH-ai-ai/old/PROJECT.md
- 父协调者会话ID：8cea2f46c026fd00f3b48d89dfef6e59
- 代码仓库根路径：/home/antigravity/MH-ai-ai/old

【MANDATORY INTEGRITY WARNING 铁律】：
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

【你的专属写权限与专属任务（Track A: E2E Testing Track）】：
你拥有项目根目录下 TEST_INFRA.md、TEST_READY.md 以及 backend/tests/e2e/ 测试目录的独占写入权限。严禁修改业务实现代码（src/）。

1. **编制项目根目录 TEST_INFRA.md**：
   - 严格遵循规范模板，明确黑盒测试哲学、测试运行器命令、四层测试方法论（Category-Partition + BVA + Pairwise + Workload Testing）与特性清册覆盖映射表。
2. **构建严密的 4-Tier E2E 测试体系（位于 backend/tests/e2e/）**：
   - **Tier 1: 核心功能全覆盖（4大主线，每特性 ≥5 个独立测试用例）**：
     - 居家健康监测 (Health): 今日快照、体征趋势、手动录入、设备列表、绑定设备；
     - SOS紧急呼救 (SOS): 一键求救、5秒防误触撤销、跌倒检测上报、15秒误报解除、求救历史明细；
     - 用药提醒 (Medication): 计划创建、今日时间轴待服清单、服药确认打卡、跳过打卡、月度服药日历；
     - 守护互助 (Mutual Aid): 家属长辈全景视图、家属推送偏好设置、志愿者个人档案、助老工单接单、工单签到与签退打卡；
   - **Tier 2: 边界与极值异常测试（每特性 ≥5 个边界用例）**：
     - 收缩压 300 / 舒张压 0 / 负数心率等医学极值输入拦截校验；
     - SOS 超过 5 秒窗口期撤销拦截（严格防撤销）；
     - 跌倒倒计时超时自动升级并记入全时序流水；
     - 短时间内连续多次重复点击服药确认的幂等防呆保障；
     - 志愿者跨区域/越权接单与无权限打卡防御；
   - **Tier 3: 跨系统组合联动（Pairwise 联动流）**：
     - SOS险情触发 -> 时序流水生成 -> 社区管理屏报警 -> 志愿者工单联动；
     - 用药超时未服 -> 守护全景视图预警流实时触发；
     - 志愿助老全流程闭环：工单认领 -> 上门打卡 -> 签退 -> 服务工时流水沉淀；
   - **Tier 4: 真实长辈适老业务场景测试（≥5 个复合全链路场景）**：
     - 独居长辈清晨日常（测血压 -> 数据自动同步 -> 提醒按时服降压药 -> 打卡记录）；
     - 夜间突发险情紧急救援闭环（一键求助 -> 定位逆解析 -> 家属通知 -> 社区响应结案）；
     - 跌倒防误触自愈全流程（手环疑似跌倒 -> 10秒内长辈解除 -> 系统标记误报恢复常态）；
     - 志愿者爱心助老上门陪伴（工单调度 -> 扫码签到 -> 服务确认）；
     - 慢病长辈月度就医体征全景报告聚合。
3. **测试可执行性与自动化运行**：
   - 测试基于 Jest + Supertest 编写，采用可复用的 Mock 中间件与内存模拟，确保在无需真实外部网络下即可 100% 独立稳定执行并全部通过（绿色 PASS）；
   - 在 backend/package.json 中注册 `"test:e2e": "jest tests/e2e --runInBand"`。
4. **发布项目根目录 TEST_READY.md**：
   - 运行全部 E2E 测试并统计用例总数（确保覆盖全部特性且达到门槛）；
   - 产出标准的 TEST_READY.md（含测试运行命令、Tier 1~4 覆盖清单与各特性核验表）。
5. **提交并推送到 GitHub 远程**：
   - `git add -A`
   - `git commit -m "test(e2e): 建立 4-Tier 严密 E2E 测试体系并发布 TEST_READY.md"`
   - `git push origin refactor/code-cleanup-and-frontend`
6. **产出交接报告**：
   - 在 /home/antigravity/MH-ai-ai/old/.agents/teamwork/test_writer_e2e/handoff.md 输出详尽测试报告，并使用 send_message 向协调者汇报。
7. 全程严格使用中文。
