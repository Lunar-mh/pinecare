'use strict';

const { COMPETITION_SEED_MANIFEST } = require('../competitionSeedManifest');

const COMMUNITIES = COMPETITION_SEED_MANIFEST.communities;
const HOSPITALS = [
  { id: 31000001, name: 'Peking Union Medical College Hospital', level: '3A', city: 'Beijing' },
  { id: 31000002, name: 'West China Hospital, Sichuan University', level: '3A', city: 'Chengdu' },
  { id: 31000003, name: 'Ruijin Hospital, Shanghai Jiao Tong University School of Medicine', level: '3A', city: 'Shanghai' },
  { id: 31000004, name: 'The First Affiliated Hospital, Zhejiang University School of Medicine', level: '3A', city: 'Hangzhou' },
  { id: 31000005, name: 'The First Affiliated Hospital of Sun Yat-sen University', level: '3A', city: 'Guangzhou' },
];
const DEPARTMENTS = [
  { id: 32010001, hospitalId: 31000001, name: 'Cardiology' },
  { id: 32010002, hospitalId: 31000001, name: 'Endocrinology' },
  { id: 32010003, hospitalId: 31000002, name: 'Neurology' },
  { id: 32010004, hospitalId: 31000003, name: 'Geriatrics' },
  { id: 32010005, hospitalId: 31000004, name: 'Rehabilitation Medicine' },
  { id: 32010006, hospitalId: 31000005, name: 'General Practice' },
];
const DOCTORS = [
  { id: 33010001, hospitalId: 31000001, departmentId: 32010001, name: 'Dr. Lin Wei', title: 'Chief Physician', specialty: 'Coronary heart disease and chronic heart failure' },
  { id: 33010002, hospitalId: 31000001, departmentId: 32010002, name: 'Dr. Xu Min', title: 'Associate Chief Physician', specialty: 'Diabetes and metabolic syndrome management' },
  { id: 33010003, hospitalId: 31000002, departmentId: 32010003, name: 'Dr. Zhang Yi', title: 'Chief Physician', specialty: 'Cerebrovascular disease and post-stroke rehabilitation' },
  { id: 33010004, hospitalId: 31000003, departmentId: 32010004, name: 'Dr. Chen Hui', title: 'Associate Chief Physician', specialty: 'Comprehensive elderly disease and chronic health management' },
  { id: 33010005, hospitalId: 31000004, departmentId: 32010005, name: 'Dr. Wang Qiang', title: 'Physician', specialty: 'Post-surgical mobility rehabilitation' },
  { id: 33010006, hospitalId: 31000005, departmentId: 32010006, name: 'Dr. Zhao Lei', title: 'Associate Chief Physician', specialty: 'Multi-morbidity screening and medication counseling' },
];

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
