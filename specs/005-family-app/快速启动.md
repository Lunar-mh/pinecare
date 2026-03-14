# Quickstart: 家属端基础功能

## 核心功能

1. 微信登录绑定老人账户
2. 查看老人健康数据
3. 接收异常预警通知
4. 用药提醒同步
5. SOS紧急通知

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /family/bindings | 获取绑定列表 |
| GET | /family/health/:elderId | 获取老人健康数据 |
| GET | /family/settings | 获取通知设置 |
| PUT | /family/settings | 更新通知设置 |
