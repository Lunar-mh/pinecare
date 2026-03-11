'use strict';

const { pickLatestTime, toIsoText } = require('./shared');

function buildBloodPressureSummary(latestRecords) {
  const row = (latestRecords || []).find((item) => item.metricType === 'blood_pressure');
  if (!row) {
    return null;
  }

  const systolic = row.valueHigh == null ? null : Number(row.valueHigh);
  const diastolic = row.valueLow == null ? null : Number(row.valueLow);

  return {
    recordId: Number(row.id),
    systolic,
    diastolic,
    measuredAt: toIsoText(row.measuredAt),
    status:
      systolic !== null && diastolic !== null && (systolic > 140 || diastolic > 90)
        ? 'warning'
        : 'normal',
  };
}

function buildHeartRateSummary(latestRecords) {
  const row = (latestRecords || []).find((item) => item.metricType === 'heart_rate');
  if (!row) {
    return null;
  }

  const value = row.value == null ? null : Number(row.value);
  return {
    recordId: Number(row.id),
    value,
    measuredAt: toIsoText(row.measuredAt),
    status: value !== null && (value < 60 || value > 100) ? 'warning' : 'normal',
  };
}

function buildMedicationSummary(todayMeds) {
  const list = Array.isArray(todayMeds) ? todayMeds : [];
  const counts = {
    totalTasks: list.length,
    completedTasks: 0,
    pendingTasks: 0,
    skippedTasks: 0,
    missedTasks: 0,
  };

  let latestUpdateAt = null;

  list.forEach((item) => {
    const status = String(item.status || '').trim();
    if (status === 'taken') counts.completedTasks += 1;
    if (status === 'pending') counts.pendingTasks += 1;
    if (status === 'skipped') counts.skippedTasks += 1;
    if (status === 'missed') counts.missedTasks += 1;

    latestUpdateAt = pickLatestTime([
      latestUpdateAt,
      item.actualTime,
      item.scheduledTime,
      item.updatedAt,
      item.takenAt,
    ]);
  });

  return {
    ...counts,
    progress:
      counts.totalTasks > 0 ? Math.round((counts.completedTasks / counts.totalTasks) * 100) : 100,
    updatedAt: latestUpdateAt,
  };
}

function buildSosAlerts(events) {
  const triggerTypeText = {
    manual: 'Manual SOS request',
    fall: 'Fall detection alert',
    abnormal_vital: 'Abnormal vital sign alert',
  };

  return (events || []).map((event) => {
    const createdAt = toIsoText(event.created_at) || new Date().toISOString();
    const latestStatusChangedAt =
      toIsoText(event.cancelled_at) ||
      toIsoText(event.resolved_at) ||
      toIsoText(event.confirmed_at) ||
      createdAt;

    return {
      id: `sos-${event.id}`,
      type: 'sos',
      title:
        event.event_status === 'triggered'
          ? 'SOS request is active'
          : 'SOS event is waiting for closure',
      message: `${triggerTypeText[event.trigger_type] || 'Emergency alert'}${
        event.address ? ` at ${event.address}` : ''
      }`,
      status: event.event_status,
      createdAt,
      latestStatusChangedAt,
      notificationSummary: null,
      auditTrailSummary: {
        currentStatus: event.event_status,
        triggeredAt: createdAt,
        confirmedAt: toIsoText(event.confirmed_at),
        resolvedAt: toIsoText(event.resolved_at),
        cancelledAt: toIsoText(event.cancelled_at),
      },
      isRead: false,
    };
  });
}

function buildMedicationAlert(medicationSummary) {
  const pendingCount = medicationSummary.pendingTasks + medicationSummary.missedTasks;
  if (pendingCount <= 0) {
    return null;
  }

  return {
    id: `medication-${new Date().toISOString().slice(0, 10)}`,
    type: 'medication',
    title: 'Medication tasks still need confirmation',
    message: `${pendingCount} medication task(s) still need follow-up today.`,
    createdAt: new Date().toISOString(),
    latestStatusChangedAt: medicationSummary.updatedAt,
    notificationSummary: null,
    auditTrailSummary: null,
    isRead: false,
  };
}

function buildLocationSummary(location) {
  return {
    hasLocation: Boolean(location),
    latitude: location ? Number(location.latitude) : null,
    longitude: location ? Number(location.longitude) : null,
    address: location ? location.address || '' : '',
    updatedAt: location ? toIsoText(location.updatedAt) : null,
  };
}

function buildInteractionEvidenceSummary(familyId, evidence) {
  const safeEvidence = evidence || {};
  const voiceMessageCount = Number(safeEvidence.voiceMessageCount || 0);
  const albumCount = Number(safeEvidence.albumCount || 0);
  const pointRecordCount = Number(safeEvidence.pointRecordCount || 0);

  return {
    familyId: Number(familyId),
    voiceMessageCount,
    albumCount,
    pointRecordCount,
    hasInteractionEvidence: voiceMessageCount > 0 || albumCount > 0 || pointRecordCount > 0,
    lastInteractionAt: toIsoText(safeEvidence.lastInteractionAt),
  };
}

module.exports = {
  buildBloodPressureSummary,
  buildHeartRateSummary,
  buildInteractionEvidenceSummary,
  buildLocationSummary,
  buildMedicationAlert,
  buildMedicationSummary,
  buildSosAlerts,
};
