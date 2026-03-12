'use strict';

const { DEPARTMENTS, DOCTORS, REPORT_TYPES, isoDate, pad, pick } = require('./shared');

function buildMedicalData(elders) {
  const consultations = [];
  const appointments = [];
  const reports = [];

  for (let i = 0; i < 12; i += 1) {
    const elder = elders[i % elders.length];
    const doctor = DOCTORS[i % DOCTORS.length];
    const createdAt = isoDate(i % 20, 13, 0);
    const active = i % 3 !== 0;
    consultations.push({
      id: 19000 + i + 1,
      userId: elder.id,
      doctorId: doctor.id,
      department: pick(DEPARTMENTS, i).name,
      consultStatus: active ? 'active' : 'completed',
      sessionUrl: `https://consult.yinban.local/session/${19000 + i + 1}`,
      thirdPartySessionId: `consult_${19000 + i + 1}`,
      startedAt: createdAt,
      endedAt: active ? null : isoDate(i % 20, 13, 40),
      source: 'public_directory_cache',
      mode: 'cached_public',
      createdAt,
    });
  }

  for (let i = 0; i < 16; i += 1) {
    const elder = elders[i % elders.length];
    const doctor = DOCTORS[i % DOCTORS.length];
    appointments.push({
      id: 20000 + i + 1,
      userId: elder.id,
      hospitalId: doctor.hospitalId,
      doctorId: doctor.id,
      department: pick(DEPARTMENTS, i).name,
      appointmentDate: `2026-03-${pad((i % 28) + 1)}`,
      timeSlot: `${pad(8 + (i % 6))}:00-${pad(8 + (i % 6))}:30`,
      appointStatus: i % 5 === 0 ? 'cancelled' : 'confirmed',
      idempotencyKey: `appoint_${20000 + i + 1}`,
      source: 'public_directory_cache',
      mode: 'cached_public',
      createdAt: isoDate(i % 20, 12, 20),
    });
  }

  for (let i = 0; i < 48; i += 1) {
    const elder = elders[i % elders.length];
    const reportDate = `2026-03-${pad((i % 28) + 1)}`;
    reports.push({
      id: 21000 + i + 1,
      userId: elder.id,
      reportNo: `RPT-${elder.id}-${pad(i + 1, 4)}`,
      reportType: pick(REPORT_TYPES, i),
      reportDate,
      reportUrl: `https://reports.yinban.local/${elder.id}/${21000 + i + 1}.pdf`,
      reportData: {
        summary: `Structured ${pick(REPORT_TYPES, i)} report for elder ${elder.id}.`,
        source: 'desensitized_sample',
        indicatorCount: 3 + (i % 4),
      },
      syncStatus: 'synced',
      source: 'desensitized_sample',
      mode: 'cached_sample',
      createdAt: `${reportDate}T10:00:00Z`,
    });
  }

  return { consultations, appointments, reports };
}

module.exports = {
  buildMedicalData,
};
