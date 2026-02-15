# Data Model: 语音交互基础

## 实体定义

### 1. 语音交互会话 (VoiceSession)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 会话ID |
| user_id | BIGINT | 用户ID |
| start_time | DATETIME | 开始时间 |
| end_time | DATETIME | 结束时间 |
| rounds | INT | 交互轮次 |

### 2. 语音指令日志 (VoiceCommandLog)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | ID |
| session_id | BIGINT | 会话ID |
| user_text | TEXT | 用户语音文本 |
| recognized_text | TEXT | 识别结果 |
| response_text | TEXT | 系统回复 |
