'use strict';

const { COMPETITION_SEED_MANIFEST } = require('../competitionSeedManifest');
const { getHospitals, getDepartments, getDoctors } = require('../publicMedicalDirectory');

const COMMUNITIES = COMPETITION_SEED_MANIFEST.communities;
const HOSPITALS = getHospitals();
const DEPARTMENTS = HOSPITALS.flatMap((hospital) => getDepartments(hospital.id));
const DOCTORS = DEPARTMENTS.flatMap((department) => getDoctors(department.id));

const SURNAMES = ['Lin', 'Chen', 'Wang', 'Li', 'Zhang', 'Xu', 'Liu', 'Sun', 'Zhao', 'Wu'];
const GIVEN_NAMES = ['An', 'Rong', 'Mei', 'Jia', 'Qing', 'Yan', 'Ming', 'Hui', 'Lei', 'Tao'];
const FAMILY_RELATIONS = ['daughter', 'son', 'spouse', 'niece', 'grandson'];
const SERVICE_TYPES = ['escort', 'visit', 'rehabilitation', 'shopping', 'medication-support'];
const REPORT_TYPES = ['Lab', 'Imaging', 'FollowUp'];
const SOS_STATUSES = ['resolved', 'confirmed', 'cancelled'];

function pick(list, index) {
  return list[index % list.length];
}

function pad(num, size = 2) {
  return String(num).padStart(size, '0');
}

function buildPhone(index, prefix = '139') {
  return `${prefix}${String(10000000 + index).slice(-8)}`;
}

function buildName(index, suffix = '') {
  return `${pick(SURNAMES, index)} ${pick(GIVEN_NAMES, index + 3)}${suffix}`.trim();
}

function isoDate(dayOffset, hour = 9, minute = 0) {
  const base = new Date(Date.UTC(2026, 2, 1 + dayOffset, hour, minute, 0));
  return base.toISOString().replace('.000Z', 'Z');
}

function hashToken(prefix, id) {
  return `${prefix}${String(id).padStart(10, '0')}`.padEnd(64, '0').slice(0, 64);
}

function resolveCreditLevel(score) {
  if (score >= 95) return 'angel';
  if (score >= 90) return 'gold';
  if (score >= 85) return 'silver';
  return 'new';
}

module.exports = {
  COMPETITION_SEED_MANIFEST,
  COMMUNITIES,
  HOSPITALS,
  DEPARTMENTS,
  DOCTORS,
  FAMILY_RELATIONS,
  SERVICE_TYPES,
  REPORT_TYPES,
  SOS_STATUSES,
  pick,
  pad,
  buildPhone,
  buildName,
  isoDate,
  hashToken,
  resolveCreditLevel,
};
