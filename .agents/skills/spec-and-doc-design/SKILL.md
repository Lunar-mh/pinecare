---
name: spec-and-doc-design
description: 规格契约与技术文档设计规范。覆盖规格驱动开发（Spec-Driven Development）、OpenAPI 3.1 接口契约标准、架构决策记录（ADR）设计、模块规格 5 大件标准（contracts/checklists/数据模型/任务调度/实施计划）以及文档长效维护准则。
---

# 规格契约与技术文档设计规范 (Spec and Doc Design)

本技能确立“**规格先行、契约驱动、自解释演进**”的工程文档设计规范。在现代复杂系统（如银伴 15 大业务子模块）中，清晰、准确且与代码保持一致的规格文档是前后端解耦协作与系统长期稳定的基石。

---

## 1. 规格驱动开发哲学 (Spec-Driven Development)

1. **契约先行（Contract First）**：
   - 业务接口与数据结构必须在编码前产出并评审通过。严禁“先写后端代码、再让前端猜入参、最后靠抓包补文档”的失序开发。
2. **文档即真理（Single Source of Truth）**：
   - 所有的功能边界、入参限制、错误码定义以 `specs/` 目录下的 OpenAPI 契约与核验清单为唯一准则。
3. **保持自解释与防腐（Self-Explaining & Living Docs）**：
   - 文档不应只是静态文字死物，而应包含字段枚举描述、错误示例、状态机跃迁图，且必须随代码迭代而同步修正。

---

## 2. OpenAPI 3.1 接口契约设计规范

在银伴平台中，接口契约统一遵循 OpenAPI 3.1 规范编写（存放于 `specs/<module>/contracts/openapi.yaml`）。

### 2.1 基础元数据与统一包装
所有 API 响应必须引用通用的统一响应包装 Schema：

```yaml
openapi: 3.1.0
info:
  title: 银伴子系统接口契约
  version: 1.0.0
  description: 规范化 RESTful API 契约文档

paths:
  /api/v1/medication/plans:
    get:
      summary: 获取今日用药提醒列表
      operationId: getTodayMedicationPlans
      tags:
        - Medication
      parameters:
        - name: date
          in: query
          required: false
          description: 查询日期（YYYY-MM-DD），默认当天
          schema:
            type: string
            format: date
      responses:
        '200':
          description: 获取成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MedicationPlanListResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  schemas:
    ApiResponse:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: integer
          description: 业务状态码（0 代表成功，非 0 代表失败错误码）
          example: 0
        message:
          type: string
          description: 人类可读的状态或错误提示
          example: 操作成功
        data:
          type: object
          nullable: true
          description: 业务响应主体

    MedicationPlanListResponse:
      allOf:
        - $ref: '#/components/schemas/ApiResponse'
        - type: object
          properties:
            data:
              type: array
              items:
                $ref: '#/components/schemas/MedicationPlanItem'
```

### 2.2 错误码标准化设计
- 成功状态：`code: 0`。
- 客户端错误（4xx 系列）：
  - `400`：参数格式校验失败（ValidationError）
  - `401`：未提供有效凭证或 Token 已过期（Unauthorized）
  - `403`：权限不足（如非家属角色禁止查看老人私密档案）
  - `404`：请求的业务实体不存在（NotFound）
  - `409`：资源冲突（如重复签到、重复绑卡）
  - `422`：业务规则校验不通过（如药品之间存在严重相互作用禁忌）
- 服务端错误（5xx 系列）：
  - `500`：服务器内部未知异常
  - `503`：外部第三方服务（如阿里云、科大讯飞、医院接口）超时或熔断降级

---

## 3. 银伴模块规格 5 大件标准 (Standard Module Specs)

每个独立业务模块（如 `001-user-auth` 至 `015-medical-integration`）必须具备以下 5 项完备文档结构：

```text
specs/<xxx-module-name>/
├── contracts/
│   └── openapi.yaml           # [1] OpenAPI 3.1 机器可读与自动化校验契约
├── checklists/
│   └── requirements.md        # [2] 需求用例核验与验收清单
├── 数据模型.md                # [3] MySQL 表结构、索引、字段枚举与 ER 关联
├── 任务调度.md                # [4] 模块内定时 Cron、异步队列与触发规则
└── 实施计划.md                # [5] 任务拆解、依赖拓扑与交付里程碑
```

### 3.1 各文档核心编写指引
1. **`contracts/openapi.yaml`**：包含所有该模块承载的 REST 端点、数据定义、示例请求/响应。
2. **`checklists/requirements.md`**：以 Markdown 勾选框形式拆解功能用例（如 `- [x] 支持紧急联系人短信一键通知`），直接指导单元测试与验收测试。
3. **`数据模型.md`**：给出严谨的 SQL DDL 语句、字段级中文注释、主外键设计与索引考量（覆盖索引、唯一索引）。
4. **`任务调度.md`**：明确 Cron 表达式（如 `* * * * *` 每分钟检查）、任务并发控制、分布式防重机制与超时重试策略。
5. **`实施计划.md`**：罗列技术设计、数据迁移、Service 落地、联调与交付验收的时间线与阻碍排查。

---

## 4. 架构决策记录标准 (Architecture Decision Record - ADR)

当面对重大技术选型、架构分歧或权衡变更时，必须编写轻量级 ADR 文档，模板格式如下：

```markdown
# ADR-00X: [决策简短标题，如：采用单体模块化 Express 替代微服务架构]

## 1. 状态 (Status)
[提议中 (Proposed) | 已采纳 (Accepted) | 已废除 (Deprecated) | 被替代 (Superseded)]

## 2. 背景与问题上下文 (Context)
说明为什么要做这个决策？面临的核心挑战、硬件约束、竞赛答辩或试点场景是什么？

## 3. 考虑的备选方案 (Considered Options)
- 方案 A：...（优缺点）
- 方案 B：...（优缺点）

## 4. 最终决议 (Decision)
我们选择方案 [X]，因为其具备最契合项目当前生命周期的特征...

## 5. 后果与代价值 (Consequences)
- **正面收益**：部署零门槛、统一事务控制、诊断集中...
- **负面成本/妥协**：单体包体积需严格治理、多模块公共依赖管理需高度自律...
```

---

## 5. 技术文档自查清单 (Spec Design Checklist)

- [ ] **语义清晰**：接口 URL 是否采用 RESTful 资源复数命名（如 `/medication/plans` 而非 `/getMedicationPlan`）？
- [ ] **必填完整**：OpenAPI 中所有请求 Body 的必填属性是否在 `required: [...]` 中显式声明？
- [ ] **数据模型严谨**：MySQL 表是否包含 `id` (BIGINT/INT PK)、`created_at`、`updated_at` 标准三字段？重要查询列是否建立了适当索引？
- [ ] **状态机闭环**：任务与工单流转状态是否有完整的状态机跳迁图，是否存在“无法结束”的死锁状态？
- [ ] **真实示例**：接口文档中是否有真实可理解的 JSON 示例，而非空对象 `{}` 或省略号 `...`？
