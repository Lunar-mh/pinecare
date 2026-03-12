# Live Cutover Handover

## Goal
This handover describes the final step from the current `stub-ready / live-ready` release candidate to a real-provider rehearsal build.

## Cutover order
1. Medical directory and appointment
2. WeChat notification and SOS SMS
3. Voice ASR and TTS
4. OSS upload

## Validation interfaces
- `/api/v1/admin/system/integrations`
- `/api/v1/admin/system/evidence`
- `/api/v1/admin/system/event-replay`
- `/readyz`
- `/livez`

## Medical
### Required env
- `MEDICAL_API_MODE=live`
- `MEDICAL_API_BASE_URL`
- `MEDICAL_API_KEY`
- `MEDICAL_API_AUTH_MODE`
- `MEDICAL_API_ALLOW_STUB_FALLBACK=false` when doing strict live rehearsal

### Expected validation
- `effectiveMode=live`
- `liveConfigured=true`
- `lastSuccessAt` updated after directory or appointment call
- `lastError` empty or only historical

### Rollback
- Set `MEDICAL_API_MODE=auto` or `stub`
- Restore `MEDICAL_API_ALLOW_STUB_FALLBACK=true`
- Recheck `/admin/system/integrations`

## Notification
### Required env
- `WECHAT_NOTIFY_MODE=live`
- `WX_ACCESS_TOKEN`
- `WX_MSG_TEMPLATE_ID`
- `SOS_SMS_MODE=live`
- `ALIYUN_ACCESS_KEY_ID`
- `ALIYUN_ACCESS_KEY_SECRET`
- `SOS_SMS_SIGN_NAME`
- `SOS_SMS_TEMPLATE_CODE`

### Expected validation
- `wechat_notify` and `sos_sms_notify` show `effectiveMode=live`
- `recentReceipt` or request IDs appear in evidence output
- `errorCount` does not increase during rehearsal

### Rollback
- Restore `WECHAT_NOTIFY_MODE=auto`
- Restore `SOS_SMS_MODE=auto`
- Recheck evidence and queue health

## Voice
### Required env
- `VOICE_SERVICE_MODE=live`
- `DASHSCOPE_API_KEY`
- Any provider-specific timeout overrides as needed

### Expected validation
- `voice` shows `effectiveMode=live`
- `lastSuccessAt` updates after ASR/TTS call
- voice receipt or request trace is captured in the evidence pack

### Rollback
- Restore `VOICE_SERVICE_MODE=auto`
- Confirm `fallbackAllowed=true` if sandbox rollback is desired

## OSS
### Required env
- `OSS_MODE=live`
- `OSS_UPLOAD_API_URL` and `OSS_UPLOAD_TOKEN`, or
- `OSS_ENDPOINT`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`
- `OSS_PUBLIC_BASE_URL`

### Expected validation
- `oss` shows `effectiveMode=live`
- upload response contains desensitized object key or URL
- `lastSuccessAt` updates after upload

### Rollback
- Restore `OSS_MODE=stub` or `auto`
- Recheck `/admin/system/integrations`

## Evidence preparation
- Use `backend/docs/live-evidence-templates.md`
- Capture request IDs, task IDs, receipt IDs, screenshots, and replay user IDs in desensitized form
- Do not mix competition seed evidence with real live evidence
