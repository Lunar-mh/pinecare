# 小程序全页面联调清单（逐页打点）

- 生成时间：2026-03-14T06:16:36.567Z
- API 基线：http://127.0.0.1:3999/api/v1
- 页面总数：28
- 2xx 成功：28
- 非 2xx：0
- 无接口页：0

| 页面 | 请求 | HTTP | 证据图 | 备注 |
|---|---|---:|---|---|
| pages/login/index | POST /auth/phone | 200 | shots/pages_login_index.png |  |
| pages/index/index | GET /health-archive/today | 200 | shots/pages_index_index.png |  |
| pages/index/FamilyDashboard | GET /family/elderly-overview | 200 | shots/pages_index_FamilyDashboard.png |  |
| pages/services/index | GET /user/page-config | 200 | shots/pages_services_index.png |  |
| pages/profile/index | GET /user/info | 200 | shots/pages_profile_index.png |  |
| subpackages/health/pages/index/index | GET /health-archive/today | 200 | shots/subpackages_health_pages_index_index.png |  |
| subpackages/health/pages/blood-pressure/index | GET /health-archive/trend?metric_type=blood_pressure&period=30d | 200 | shots/subpackages_health_pages_blood-pressure_index.png |  |
| subpackages/health/pages/heart-rate/index | GET /health-archive/trend?metric_type=heart_rate&period=30d | 200 | shots/subpackages_health_pages_heart-rate_index.png |  |
| subpackages/health/pages/trend/index | GET /health-archive/trend?metric_type=blood_pressure&period=7d | 200 | shots/subpackages_health_pages_trend_index.png |  |
| subpackages/health/pages/records/index | GET /health-archive/trend?metric_type=heart_rate&period=30d | 200 | shots/subpackages_health_pages_records_index.png |  |
| subpackages/family_health/pages/blood-pressure/index | GET /health-archive/blood-pressure/latest | 200 | shots/subpackages_family_health_pages_blood-pressure_index.png |  |
| subpackages/family_health/pages/heart-rate/index | GET /health-archive/heart-rate/latest | 200 | shots/subpackages_family_health_pages_heart-rate_index.png |  |
| subpackages/medication/pages/index/index | GET /medication/plans | 200 | shots/subpackages_medication_pages_index_index.png |  |
| subpackages/medication/pages/add/index | POST /medication/plans | 200 | shots/subpackages_medication_pages_add_index.png |  |
| subpackages/sos/pages/index/index | GET /family/elderly-overview | 200 | shots/subpackages_sos_pages_index_index.png |  |
| subpackages/voice_ai/pages/index/index | GET /ai-consult/history?sessionId=proof-1773468996186&limit=20 | 200 | shots/subpackages_voice_ai_pages_index_index.png |  |
| subpackages/timebank/pages/index/index | GET /time-bank/account | 200 | shots/subpackages_timebank_pages_index_index.png |  |
| subpackages/family_space/pages/index/index | GET /family-space/message/list?page=1&pageSize=5 | 200 | shots/subpackages_family_space_pages_index_index.png |  |
| subpackages/location/pages/index/index | GET /gps/current | 200 | shots/subpackages_location_pages_index_index.png |  |
| subpackages/medical/pages/index/index | GET /medical/hospitals | 200 | shots/subpackages_medical_pages_index_index.png |  |
| subpackages/ai_consult/pages/index/index | GET /ai-consult/profile | 200 | shots/subpackages_ai_consult_pages_index_index.png |  |
| subpackages/drug_check/pages/index/index | GET /drug-interaction/history | 200 | shots/subpackages_drug_check_pages_index_index.png |  |
| subpackages/ai_companion/pages/index/index | GET /ai-companion/companion/games | 200 | shots/subpackages_ai_companion_pages_index_index.png |  |
| subpackages/settings/pages/index/index | GET /user/page-config | 200 | shots/subpackages_settings_pages_index_index.png |  |
| subpackages/settings/pages/about/index | GET /user/page-config | 200 | shots/subpackages_settings_pages_about_index.png |  |
| subpackages/settings/pages/device/index | GET /device/list | 200 | shots/subpackages_settings_pages_device_index.png |  |
| subpackages/settings/pages/emergency/index | GET /user/emergency-contacts | 200 | shots/subpackages_settings_pages_emergency_index.png |  |
| subpackages/settings/pages/feedback/index | POST /user/feedback | 200 | shots/subpackages_settings_pages_feedback_index.png |  |