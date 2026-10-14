export { http as default, http } from './api'
export type { ApiResponse } from './api'

export { adminLogin, adminLogout } from './auth'
export type { LoginPayload, LoginResult } from './auth'

export { getDashboardStats, getRecentActivities, getSystemStats } from './dashboard'
export type { StatItem, ActivityItem, DashboardStats, DashboardOverviewStats, SystemStats } from './dashboard'

export { getUsers, updateUserStatus, createUser, getUserDetail } from './users'
export type {
  UserItem,
  UserRole,
  UserStatus,
  UserListParams,
  UserListResult,
  CreateUserPayload,
} from './users'

export {
  getCommunityVolunteers,
  getCommunityStats,
  getCommunityActivities,
  createCommunityActivity,
} from './community'
export type {
  Pagination,
  CommunityVolunteerItem,
  CommunityVolunteerResult,
  CommunityVolunteerParams,
  CommunityStats,
  CommunityActivityItem,
  CommunityActivityResult,
  CommunityActivityParams,
  CreateCommunityActivityPayload,
} from './community'

export { getAdminFamilyBindings } from './family'
export type { FamilyBindingItem, AdminFamilyBindingsResult } from './family'

export { getSosHistory, confirmSosEvent, resolveSosEvent } from './sos'
export type { SosEventStatus, SosEventItem, SosHistoryResult, SosHistoryParams } from './sos'

export { getFallHistory, getFallSettings, updateFallSettings } from './fall'
export type { FallEventStatus, FallEventItem, FallHistoryResult, FallHistoryParams } from './fall'

export { getDrugInteractionHistory, acknowledgeDrugInteraction } from './drug'
export type { DrugRiskLevel, DrugRecordStatus, DrugInteractionRecord } from './drug'

export {
  getTimeBankLeaderboard,
  getTimeBankServiceHistory,
  confirmTimeBankService,
  getTimeBankExchangeHistory,
} from './timebank'
export type {
  TimeBankLeaderboardItem,
  TimeBankServiceRecord,
  TimeBankServiceHistoryResult,
  TimeBankExchangeRecord,
  TimeBankServiceHistoryParams,
} from './timebank'

export {
  getMedicalHospitals,
  getMedicalDepartments,
  getMedicalDoctors,
  getAdminMedicalReports,
} from './medical'
export type {
  MedicalHospitalItem,
  MedicalDepartmentItem,
  MedicalDoctorItem,
  MedicalReportItem,
  AdminMedicalReportResult,
} from './medical'

export {
  getHealthToday,
  getLatestBloodPressure,
  getLatestHeartRate,
  getAdminHealthOverview,
} from './health'
export type {
  HealthTodayResult,
  HealthMetricItem,
  HealthAlertItem,
  LatestBloodPressure,
  LatestHeartRate,
  AdminHealthOverviewItem,
  AdminHealthOverviewResult,
} from './health'

export {
  getMedicationPlans,
  getMedicationLogs,
  confirmMedicationLog,
  getMedicationSettings,
  updateMedicationSettings,
  getAdminMedicationLogs,
  updateAdminMedicationLogStatus,
} from './medication'
export type {
  MedicationPlanItem,
  MedicationLogItem,
  MedicationLogResult,
  MedicationSettings,
  AdminMedicationLogItem,
  AdminMedicationLogResult,
} from './medication'

export {
  getGpsCurrent,
  getGpsTrail,
  getAdminGpsCurrent,
  getAdminGpsTrail,
} from './gps'
export type {
  GpsCurrentLocation,
  GpsTrailItem,
  GpsTrailResult,
  AdminGpsCurrentItem,
  AdminGpsCurrentResult,
  AdminGpsTrailResult,
} from './gps'

export {
  getSystemEvidence,
  getSystemEventReplay,
  bootstrapDemoScenario,
} from './ops'
export type {
  SystemIntegrationItem,
  SystemEvidenceBundle,
  SystemEventReplay,
  DemoBootstrapResult,
} from './ops'
