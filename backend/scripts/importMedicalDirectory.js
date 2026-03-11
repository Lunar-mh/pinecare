'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { query, pool } = require('../src/config/database');
const medicalDirectoryModel = require('../src/models/medicalDirectoryModel');

const ROOT_DIR = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const REPORT_DIR = path.join(ROOT_DIR, 'generated', 'medical-directory');
const REPORT_FILE = path.join(REPORT_DIR, 'latest-import-report.json');
const DEFAULT_FILE = path.join(ROOT_DIR, 'templates', 'medical-directory.template.json');

const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS medical_directory_cache (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  directory_type ENUM('hospital', 'department', 'doctor') NOT NULL,
  business_key VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  hospital_id BIGINT NULL,
  department_id BIGINT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_medical_directory_cache (directory_type, business_key, hospital_id, department_id),
  INDEX idx_medical_directory_type (directory_type),
  INDEX idx_medical_directory_hospital (hospital_id),
  INDEX idx_medical_directory_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function ensureCacheTable() {
  await query(CACHE_TABLE_SQL);
}


function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return null;
}

function toPositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function toTrimmedText(value, fieldName) {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`${fieldName} is required.`);
  }
  return text;
}

function normalizeHospital(item, index) {
  return {
    id: toPositiveInt(item.id, `hospitals[${index}].id`),
    name: toTrimmedText(item.name, `hospitals[${index}].name`),
    level: toTrimmedText(item.level, `hospitals[${index}].level`),
    city: toTrimmedText(item.city, `hospitals[${index}].city`),
  };
}

function normalizeDepartment(item, index) {
  return {
    id: toPositiveInt(item.id, `departments[${index}].id`),
    hospitalId: toPositiveInt(item.hospitalId, `departments[${index}].hospitalId`),
    name: toTrimmedText(item.name, `departments[${index}].name`),
  };
}

function normalizeDoctor(item, index) {
  return {
    id: toPositiveInt(item.id, `doctors[${index}].id`),
    hospitalId: toPositiveInt(item.hospitalId, `doctors[${index}].hospitalId`),
    departmentId: toPositiveInt(item.departmentId, `doctors[${index}].departmentId`),
    name: toTrimmedText(item.name, `doctors[${index}].name`),
    title: toTrimmedText(item.title, `doctors[${index}].title`),
    specialty: toTrimmedText(item.specialty, `doctors[${index}].specialty`),
  };
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});
}

function loadDataset(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const normalizedRaw = raw.replace(/^\uFEFF/, '');
  const parsed = JSON.parse(normalizedRaw);

  const hospitals = Array.isArray(parsed.hospitals) ? parsed.hospitals.map(normalizeHospital) : [];
  const departments = Array.isArray(parsed.departments)
    ? parsed.departments.map(normalizeDepartment)
    : [];
  const doctors = Array.isArray(parsed.doctors) ? parsed.doctors.map(normalizeDoctor) : [];

  if (!hospitals.length) {
    throw new Error('Dataset must contain at least one hospital.');
  }

  const hospitalIds = new Set(hospitals.map((item) => item.id));
  const departmentIds = new Set();

  departments.forEach((item) => {
    if (!hospitalIds.has(item.hospitalId)) {
      throw new Error(`Department ${item.id} references missing hospitalId ${item.hospitalId}.`);
    }
    if (departmentIds.has(item.id)) {
      throw new Error(`Duplicate department id: ${item.id}.`);
    }
    departmentIds.add(item.id);
  });

  const doctorIds = new Set();
  doctors.forEach((item) => {
    if (!hospitalIds.has(item.hospitalId)) {
      throw new Error(`Doctor ${item.id} references missing hospitalId ${item.hospitalId}.`);
    }
    if (!departmentIds.has(item.departmentId)) {
      throw new Error(`Doctor ${item.id} references missing departmentId ${item.departmentId}.`);
    }
    if (doctorIds.has(item.id)) {
      throw new Error(`Duplicate doctor id: ${item.id}.`);
    }
    doctorIds.add(item.id);
  });

  return { hospitals, departments, doctors };
}

function buildSummary(filePath, dataset, dryRun) {
  return {
    generatedAt: new Date().toISOString(),
    dryRun,
    filePath,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || 'yinban',
      user: process.env.DB_USER || 'root',
    },
    counts: {
      hospitals: dataset.hospitals.length,
      departments: dataset.departments.length,
      doctors: dataset.doctors.length,
    },
    preview: {
      hospitals: dataset.hospitals.slice(0, 3),
      departments: dataset.departments.slice(0, 3),
      doctors: dataset.doctors.slice(0, 3),
    },
    nextStep: dryRun
      ? 'Remove --dry-run to import this curated medical directory into medical_directory_cache.'
      : 'Import finished. Verify via GET /medical/hospitals and GET /admin/system/integrations.',
  };
}

async function importMedicalDirectory({ filePath, dryRun = false }) {
  const resolvedPath = path.resolve(filePath || DEFAULT_FILE);
  const dataset = loadDataset(resolvedPath);
  const summary = buildSummary(resolvedPath, dataset, dryRun);

  ensureDir(REPORT_DIR);

  if (dryRun) {
    fs.writeFileSync(REPORT_FILE, `${JSON.stringify({ ...summary, status: 'ready' }, null, 2)}\n`, 'utf8');
    return { ...summary, status: 'ready' };
  }

  const departmentGroups = groupBy(dataset.departments, 'hospitalId');
  const doctorGroups = groupBy(dataset.doctors, 'departmentId');

  await ensureCacheTable();
  await query("DELETE FROM medical_directory_cache WHERE directory_type IN ('doctor', 'department', 'hospital')");
  await medicalDirectoryModel.refreshHospitals(dataset.hospitals);

  for (const [hospitalId, departments] of Object.entries(departmentGroups)) {
    await medicalDirectoryModel.refreshDepartments(Number(hospitalId), departments);
  }

  for (const [departmentId, doctors] of Object.entries(doctorGroups)) {
    await medicalDirectoryModel.refreshDoctors(Number(departmentId), doctors);
  }

  const result = {
    ...summary,
    status: 'imported',
    importedAt: new Date().toISOString(),
  };

  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return result;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const filePath = getArgValue('--file') || DEFAULT_FILE;
  const result = await importMedicalDirectory({ filePath, dryRun });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      process.stderr.write(`${err.stack || err.message}\n`);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await pool.end();
      } catch (_err) {
        // ignore pool shutdown errors
      }
    });
}

module.exports = {
  importMedicalDirectory,
  loadDataset,
  buildSummary,
};
