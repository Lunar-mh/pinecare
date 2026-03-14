# frontend/

微信小程序用户端，使用 Taro 4 + React 18 + TypeScript。当前版本已经完成非 live 收官，默认接入统一 Docker 演示基线。

## 默认环境
- 默认 API 基线：`http://127.0.0.1:3001/api/v1`
- 显式覆盖方式：设置 `TARO_APP_API_BASE_URL`
- 默认目标：在不接真实接口的情况下，完整跑通既有后端链路并展示稳定空态

## 常用命令
```bash
npm install
npm run typecheck
npm run build:weapp
npm run dev:weapp
```

## 当前收口状态
- 医疗、定位、AI、语音、设置等核心入口已移除 unfinished 占位提示
- 关于页已接入正式协议、隐私、免责声明和版本信息
- 构建可通过，存在一个已记录的 CSS order warning，不影响产物正确性和答辩演示

## 关键目录
- `src/pages/`：主包页面
- `src/subpackages/`：业务分包
- `src/services/request.ts`：统一 HTTP 入口
- `src/components/elderly/`：适老化组件

## 联调说明
- 默认使用 `/api/v1` 路由
- 如需切换到其他环境，只通过 `TARO_APP_API_BASE_URL` 覆盖，不修改代码中的默认值
