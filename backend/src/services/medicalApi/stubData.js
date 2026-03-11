'use strict';

function stubHospitals() {
  return [
    { id: 1001, name: 'Yinban First People Hospital', level: '3A', city: 'Shanghai' },
    { id: 1002, name: 'Yinban Integrated Medicine Hospital', level: '3', city: 'Shanghai' },
    { id: 1003, name: 'Yinban Rehabilitation Hospital', level: '2', city: 'Shanghai' },
  ];
}

function stubDepartments(hospitalId) {
  return [
    { id: 2001, hospitalId, name: 'Cardiology' },
    { id: 2002, hospitalId, name: 'Endocrinology' },
    { id: 2003, hospitalId, name: 'Neurology' },
  ];
}

function stubDoctors(departmentId) {
  return [
    { id: 3001, departmentId, name: 'Dr. Zhang', title: 'Chief Physician' },
    { id: 3002, departmentId, name: 'Dr. Li', title: 'Associate Chief Physician' },
    { id: 3003, departmentId, name: 'Dr. Wang', title: 'Attending Physician' },
  ];
}

function stubDoctorDetail(doctorId) {
  const doctors = stubDoctors(2001);
  return doctors.find((item) => Number(item.id) === Number(doctorId)) || null;
}

function stubConsultSession(payload) {
  const sessionId = `consult_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    thirdPartySessionId: sessionId,
    sessionUrl: `https://consult.example.com/session/${sessionId}`,
    consultStatus: 'active',
    startedAt: new Date(),
    doctorId: Number(payload.doctorId),
  };
}

function stubAppointment(payload) {
  return {
    thirdPartyAppointId: `appoint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    appointStatus: 'confirmed',
    hospitalId: Number(payload.hospitalId),
    doctorId: Number(payload.doctorId),
  };
}

function stubAppointmentCancellation(payload = {}) {
  return {
    thirdPartyAppointId: payload.thirdPartyAppointId || `cancel_${Date.now()}`,
    appointStatus: 'cancelled',
    cancelStatus: 'ok',
  };
}

function stubMedicalReports(userId, filters = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const reports = [
    {
      reportNo: `RPT-${userId}-001`,
      reportType: 'Lab',
      reportDate: today,
      reportUrl: 'https://report.example.com/rpt-001.pdf',
      reportData: { item: 'CBC', summary: 'All metrics are within normal range.' },
      syncStatus: 'synced',
    },
    {
      reportNo: `RPT-${userId}-002`,
      reportType: 'Imaging',
      reportDate: today,
      reportUrl: 'https://report.example.com/rpt-002.pdf',
      reportData: { item: 'Chest CT', summary: 'No obvious abnormality found.' },
      syncStatus: 'synced',
    },
  ];

  if (filters.reportType) {
    return reports.filter((item) => item.reportType === filters.reportType);
  }

  return reports;
}

module.exports = {
  stubAppointment,
  stubAppointmentCancellation,
  stubConsultSession,
  stubDepartments,
  stubDoctorDetail,
  stubDoctors,
  stubHospitals,
  stubMedicalReports,
};
