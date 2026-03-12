'use strict';

const { toMysqlDateTime } = require('./shared');

function buildUsers(dataset) {
  const elderDiseaseMap = dataset.elders.reduce((map, elder) => {
    map[elder.id] = elder.chronicDiseases || [];
    return map;
  }, {});

  const rows = [];
  const pushRow = (item, role, index) => {
    rows.push({
      id: item.id,
      phone: item.phone,
      openid: `${role}_${item.id}`,
      nickname: item.nickname || `${role}_${index + 1}`,
      avatar_url: null,
      real_name: item.name,
      age: item.age || null,
      gender: item.gender || 'unknown',
      chronic_diseases: role === 'elder' ? elderDiseaseMap[item.id] || [] : null,
      password_hash: null,
      account_status: 'active',
      failed_login_attempts: 0,
      locked_until: null,
      created_at: toMysqlDateTime(item.createdAt || '2026-03-01T08:00:00Z'),
      updated_at: toMysqlDateTime(item.createdAt || '2026-03-01T08:00:00Z'),
      last_login_at: toMysqlDateTime(item.createdAt || '2026-03-01T08:00:00Z'),
    });
  };

  dataset.communityAdmins.forEach((item, index) => pushRow(item, 'community_admin', index));
  dataset.volunteers.forEach((item, index) => pushRow(item, 'volunteer', index));
  dataset.elders.forEach((item, index) => pushRow(item, 'elder', index));
  dataset.familyMembers.forEach((item, index) => pushRow(item, 'family', index));

  return rows;
}

function buildCommunityAdmins(dataset) {
  return dataset.communityAdmins.map((item, index) => ({
    id: index + 1,
    user_id: item.id,
    community_id: item.communityId,
    role: 'admin',
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildEmergencyContacts(dataset) {
  return dataset.emergencyContacts.map((item) => ({
    id: item.id,
    user_id: item.userId,
    name: item.name,
    phone: item.phone,
    relationship: item.relationship,
    is_primary: item.isPrimary,
    created_at: toMysqlDateTime(item.createdAt),
    updated_at: toMysqlDateTime(item.updatedAt),
  }));
}

function buildFamilyBindings(dataset) {
  return dataset.familyBindings.map((item) => ({
    id: item.id,
    elder_user_id: item.elderId,
    family_user_id: item.familyId,
    binding_status: item.status,
    qr_code: `bind_${item.id}`,
    qr_expired_at: toMysqlDateTime(item.createdAt),
    approved_at: toMysqlDateTime(item.approvedAt),
    rejected_at: null,
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildHealthArchives(dataset) {
  return dataset.healthArchives.map((item) => ({
    id: item.id,
    user_id: item.userId,
    created_at: toMysqlDateTime(item.createdAt),
    updated_at: toMysqlDateTime(item.updatedAt),
  }));
}

function buildMedicationPlans(dataset) {
  return dataset.medicationPlans.map((item) => ({
    id: item.id,
    user_id: item.userId,
    medication_name: item.medicationName,
    dosage: item.dosage,
    frequency: item.frequency,
    remind_times: item.reminderTimes,
    start_date: item.startDate,
    end_date: item.endDate,
    remaining_quantity: item.remainingQuantity,
    reminder_threshold: item.reminderThreshold,
    is_active: 1,
    created_at: toMysqlDateTime(item.createdAt),
    updated_at: toMysqlDateTime(item.updatedAt),
  }));
}

function buildMedicationLogs(dataset) {
  return dataset.medicationLogs.map((item) => ({
    id: item.id,
    user_id: item.userId,
    plan_id: item.planId,
    scheduled_time: toMysqlDateTime(item.scheduledAt),
    actual_time: toMysqlDateTime(item.actualAt),
    status: item.status,
    reminder_sent: item.reminderSent,
    second_reminder_sent: item.secondReminderSent,
    family_notified: item.familyNotified,
    created_at: toMysqlDateTime(item.createdAt),
    updated_at: toMysqlDateTime(item.updatedAt),
  }));
}

function buildLocationRecords(dataset) {
  return dataset.gpsTracks.map((item) => ({
    id: item.id,
    user_id: item.userId,
    latitude: item.latitude,
    longitude: item.longitude,
    accuracy: item.accuracy,
    location_type: 'gps',
    created_at: toMysqlDateTime(item.recordedAt),
  }));
}

function buildSosEvents(dataset) {
  return dataset.sosEvents.map((item) => ({
    id: item.id,
    user_id: item.userId,
    trigger_type: item.triggerType,
    latitude: item.latitude,
    longitude: item.longitude,
    address: item.address,
    event_status: item.status,
    created_at: toMysqlDateTime(item.createdAt),
    confirmed_at: item.status === 'confirmed' || item.status === 'resolved' ? toMysqlDateTime(item.latestStatusChangedAt) : null,
    resolved_at: item.status === 'resolved' ? toMysqlDateTime(item.latestStatusChangedAt) : null,
    cancelled_at: item.status === 'cancelled' ? toMysqlDateTime(item.latestStatusChangedAt) : null,
    updated_at: toMysqlDateTime(item.latestStatusChangedAt),
  }));
}

function buildServiceOrders(dataset) {
  return dataset.serviceOrders.map((item) => ({
    id: item.id,
    order_no: item.orderNo,
    community_id: item.communityId,
    service_type: item.serviceType,
    elder_id: item.elderId,
    volunteer_id: item.volunteerId,
    status: item.status,
    scheduled_at: toMysqlDateTime(item.scheduledAt),
    completed_at: toMysqlDateTime(item.completedAt),
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildVolunteerAttendance(dataset) {
  return dataset.volunteerAttendanceLogs.map((item) => ({
    id: item.id,
    order_id: item.orderId,
    community_id: item.communityId,
    volunteer_user_id: item.volunteerUserId,
    check_in_at: toMysqlDateTime(item.checkInAt),
    check_out_at: toMysqlDateTime(item.checkOutAt),
    created_at: toMysqlDateTime(item.createdAt),
    updated_at: toMysqlDateTime(item.updatedAt),
  }));
}

function buildTimeAccounts(dataset) {
  return dataset.timeBankAccounts.map((item) => ({
    id: item.id,
    user_id: item.userId,
    balance: item.balance,
    total_earned: item.totalEarned,
    total_spent: item.totalSpent,
    credit_score: item.creditScore,
    credit_level: item.creditLevel,
    created_at: toMysqlDateTime(item.createdAt),
    updated_at: toMysqlDateTime(item.updatedAt),
  }));
}

function buildServiceRecords(dataset) {
  return dataset.serviceRecords.map((item) => ({
    id: item.id,
    record_hash: item.recordHash,
    prev_hash: item.prevHash,
    provider_id: item.providerId,
    recipient_id: item.recipientId,
    service_type: item.serviceType,
    start_time: toMysqlDateTime(item.startTime),
    end_time: toMysqlDateTime(item.endTime),
    duration_hours: item.durationHours,
    time_coins: item.timeCoins,
    location_hash: item.locationHash,
    status: item.status,
    provider_signature: item.providerSignature,
    recipient_signature: item.recipientSignature,
    platform_signature: item.platformSignature,
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildExchangeRecords(dataset) {
  return dataset.timeBankExchanges.map((item) => ({
    id: item.id,
    user_id: item.userId,
    exchange_type: item.exchangeType,
    item_name: item.itemName,
    coins_required: item.coinsRequired,
    status: item.status,
    created_at: toMysqlDateTime(item.createdAt),
    completed_at: toMysqlDateTime(item.completedAt),
  }));
}

function buildOnlineConsultations(dataset) {
  return dataset.consultations.map((item) => ({
    id: item.id,
    user_id: item.userId,
    doctor_id: item.doctorId,
    department: item.department,
    consult_status: item.consultStatus,
    session_url: item.sessionUrl,
    third_party_session_id: item.thirdPartySessionId,
    started_at: toMysqlDateTime(item.startedAt),
    ended_at: toMysqlDateTime(item.endedAt),
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildAppointments(dataset) {
  return dataset.appointments.map((item) => ({
    id: item.id,
    user_id: item.userId,
    hospital_id: item.hospitalId,
    department: item.department,
    doctor_id: item.doctorId,
    appointment_date: item.appointmentDate,
    time_slot: item.timeSlot,
    appoint_status: item.appointStatus,
    third_party_appoint_id: null,
    idempotency_key: item.idempotencyKey,
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildMedicalReports(dataset) {
  return dataset.medicalReports.map((item) => ({
    id: item.id,
    user_id: item.userId,
    report_no: item.reportNo,
    report_type: item.reportType,
    report_date: item.reportDate,
    report_url: item.reportUrl,
    report_data: item.reportData,
    sync_status: item.syncStatus,
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildAuditLogs(dataset) {
  return dataset.auditLogs.map((item) => ({
    id: item.id,
    user_id: item.userId,
    action: item.action,
    ip_address: null,
    user_agent: 'competition-seed-generator',
    details: item.details,
    created_at: toMysqlDateTime(item.createdAt),
  }));
}

function buildTableRows(dataset) {
  return {
    users: buildUsers(dataset),
    community_admins: buildCommunityAdmins(dataset),
    emergency_contacts: buildEmergencyContacts(dataset),
    family_bindings: buildFamilyBindings(dataset),
    health_archives: buildHealthArchives(dataset),
    medication_plans: buildMedicationPlans(dataset),
    medication_logs: buildMedicationLogs(dataset),
    location_records: buildLocationRecords(dataset),
    sos_events: buildSosEvents(dataset),
    service_orders: buildServiceOrders(dataset),
    volunteer_attendance_logs: buildVolunteerAttendance(dataset),
    time_accounts: buildTimeAccounts(dataset),
    service_records: buildServiceRecords(dataset),
    exchange_records: buildExchangeRecords(dataset),
    online_consultations: buildOnlineConsultations(dataset),
    appointments: buildAppointments(dataset),
    medical_reports: buildMedicalReports(dataset),
    audit_logs: buildAuditLogs(dataset),
  };
}

module.exports = {
  buildTableRows,
};
