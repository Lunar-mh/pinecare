'use strict';

const { parseSensorData, toDateTimeText } = require('../shared');
const { getUserLabel, toNumberOrNull } = require('./common');

function calcHealthRisk({ bpSystolic, bpDiastolic, heartRate, bloodSugar }) {
  const sys = Number(bpSystolic);
  const dia = Number(bpDiastolic);
  const hr = Number(heartRate);
  const sugar = Number(bloodSugar);

  const danger =
    (Number.isFinite(sys) && sys >= 160) ||
    (Number.isFinite(dia) && dia >= 100) ||
    (Number.isFinite(hr) && (hr < 55 || hr > 110)) ||
    (Number.isFinite(sugar) && sugar >= 11);
  if (danger) return 'danger';

  const warning =
    (Number.isFinite(sys) && sys >= 140) ||
    (Number.isFinite(dia) && dia >= 90) ||
    (Number.isFinite(hr) && (hr < 60 || hr > 100)) ||
    (Number.isFinite(sugar) && sugar >= 7);
  return warning ? 'warning' : 'normal';
}

function mapHealthOverviewRow(row) {
  const bpSystolic = toNumberOrNull(row.bp_systolic);
  const bpDiastolic = toNumberOrNull(row.bp_diastolic);
  const heartRate = toNumberOrNull(row.heart_rate);
  const bloodSugar = toNumberOrNull(row.blood_sugar);

  return {
    userId: Number(row.user_id),
    nickname: getUserLabel(row),
    phone: row.phone || '',
    age: toNumberOrNull(row.age),
    bloodPressure:
      bpSystolic !== null && bpDiastolic !== null ? `${bpSystolic}/${bpDiastolic}` : null,
    heartRate,
    bloodSugar,
    riskLevel: calcHealthRisk({ bpSystolic, bpDiastolic, heartRate, bloodSugar }),
    lastUpdate: toDateTimeText(row.last_update),
  };
}

function mapMedicationLogRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    nickname: getUserLabel(row),
    phone: row.phone || '',
    planId: Number(row.plan_id),
    medicationName: row.medication_name || '-',
    dosage: row.dosage || '-',
    scheduledTime: toDateTimeText(row.scheduled_time),
    actualTime: toDateTimeText(row.actual_time),
    status: row.status,
    reminderSent: Number(row.reminder_sent || 0),
    secondReminderSent: Number(row.second_reminder_sent || 0),
    familyNotified: Number(row.family_notified || 0),
  };
}

function mapGpsCurrentRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    nickname: getUserLabel(row),
    phone: row.phone || '',
    age: toNumberOrNull(row.age),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: toNumberOrNull(row.accuracy),
    locationType: row.location_type,
    updatedAt: toDateTimeText(row.created_at),
  };
}

function mapGpsTrailRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: toNumberOrNull(row.accuracy),
    locationType: row.location_type,
    createdAt: toDateTimeText(row.created_at),
  };
}

function mapFamilyBindingRow(row) {
  return {
    bindingId: Number(row.id),
    elderId: Number(row.elder_id),
    familyId: Number(row.family_id),
    status: row.status,
    boundAt: row.binding_created_at,
    elderProfile: {
      nickname: row.elder_nickname || null,
      realName: row.elder_name || null,
      avatarUrl: row.elder_avatar || null,
      gender: row.elder_gender || null,
      age: toNumberOrNull(row.elder_age),
    },
    healthArchive: {
      id: toNumberOrNull(row.health_archive_id),
      updatedAt: row.health_updated_at || null,
    },
  };
}

function mapFallEventRow(item) {
  return {
    id: Number(item.id),
    userId: Number(item.user_id),
    nickname: getUserLabel(item),
    phone: item.phone || '',
    status: item.status,
    sensorData: parseSensorData(item.sensor_data),
    sensitivity: item.sensitivity,
    detectedAt: item.detected_at,
    cancelledAt: item.cancelled_at,
    confirmedAt: item.confirmed_at,
    createdAt: item.created_at,
  };
}

module.exports = {
  mapFallEventRow,
  mapFamilyBindingRow,
  mapGpsCurrentRow,
  mapGpsTrailRow,
  mapHealthOverviewRow,
  mapMedicationLogRow,
};
