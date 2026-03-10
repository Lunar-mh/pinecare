'use strict';

const { query } = require('../config/database');

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

let tableReady = false;

async function ensureCacheTable() {
  if (tableReady) {
    return;
  }
  await query(CACHE_TABLE_SQL);
  tableReady = true;
}

function unwrap(result) {
  return Array.isArray(result) ? result[0] : result;
}

function normalizeItems(directoryType, items, scope = {}) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      const id = item && (item.id || item.hospitalId || item.departmentId || item.doctorId);
      const businessKey = String(id || `${directoryType}_${index + 1}`);
      const name = String(
        (item && (item.name || item.hospitalName || item.departmentName || item.doctorName)) || ''
      ).trim();

      if (!name) {
        return null;
      }

      return {
        directoryType,
        businessKey,
        name,
        hospitalId:
          scope.hospitalId !== undefined && scope.hospitalId !== null
            ? Number(scope.hospitalId)
            : item && item.hospitalId
              ? Number(item.hospitalId)
              : null,
        departmentId:
          scope.departmentId !== undefined && scope.departmentId !== null
            ? Number(scope.departmentId)
            : item && item.departmentId
              ? Number(item.departmentId)
              : null,
        payload: JSON.stringify(item || {}),
      };
    })
    .filter(Boolean);
}

async function insertRows(rows) {
  if (!rows.length) {
    return;
  }

  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const params = [];

  rows.forEach((row) => {
    params.push(
      row.directoryType,
      row.businessKey,
      row.name,
      row.hospitalId,
      row.departmentId,
      row.payload
    );
  });

  await query(
    `INSERT INTO medical_directory_cache
      (directory_type, business_key, name, hospital_id, department_id, payload)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      payload = VALUES(payload),
      updated_at = CURRENT_TIMESTAMP`,
    params
  );
}

function parseRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    let payload = {};
    try {
      payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    } catch (error) {
      payload = {};
    }

    return {
      ...payload,
      id: payload.id || row.business_key,
      name: payload.name || row.name,
      hospitalId: payload.hospitalId || row.hospital_id || null,
      departmentId: payload.departmentId || row.department_id || null,
      updatedAt: row.updated_at,
    };
  });
}

const medicalDirectoryModel = {
  async getHospitals() {
    await ensureCacheTable();
    const rows = unwrap(
      await query(
        `SELECT business_key, name, hospital_id, department_id, payload, updated_at
         FROM medical_directory_cache
         WHERE directory_type = 'hospital'
         ORDER BY updated_at DESC, id DESC`
      )
    );
    return parseRows(rows);
  },

  async refreshHospitals(hospitals) {
    await ensureCacheTable();
    await query(`DELETE FROM medical_directory_cache WHERE directory_type = 'hospital'`);
    const rows = normalizeItems('hospital', hospitals);
    await insertRows(rows);
  },

  async getDepartments(hospitalId) {
    await ensureCacheTable();
    const hospitalIdNum = Number(hospitalId);
    const rows = unwrap(
      await query(
        `SELECT business_key, name, hospital_id, department_id, payload, updated_at
         FROM medical_directory_cache
         WHERE directory_type = 'department'
           AND hospital_id = ?
         ORDER BY updated_at DESC, id DESC`,
        [hospitalIdNum]
      )
    );
    return parseRows(rows);
  },

  async refreshDepartments(hospitalId, departments) {
    await ensureCacheTable();
    const hospitalIdNum = Number(hospitalId);
    await query(
      `DELETE FROM medical_directory_cache
       WHERE directory_type = 'department'
         AND hospital_id = ?`,
      [hospitalIdNum]
    );
    const rows = normalizeItems('department', departments, { hospitalId: hospitalIdNum });
    await insertRows(rows);
  },

  async getDoctors(departmentId) {
    await ensureCacheTable();
    const departmentIdNum = Number(departmentId);
    const rows = unwrap(
      await query(
        `SELECT business_key, name, hospital_id, department_id, payload, updated_at
         FROM medical_directory_cache
         WHERE directory_type = 'doctor'
           AND department_id = ?
         ORDER BY updated_at DESC, id DESC`,
        [departmentIdNum]
      )
    );
    return parseRows(rows);
  },

  async findDoctorById(doctorId) {
    await ensureCacheTable();
    const rows = unwrap(
      await query(
        `SELECT business_key, name, hospital_id, department_id, payload, updated_at
         FROM medical_directory_cache
         WHERE directory_type = 'doctor'
           AND business_key = ?
         ORDER BY updated_at DESC, id DESC
         LIMIT 1`,
        [String(doctorId)]
      )
    );

    const parsed = parseRows(rows);
    return parsed[0] || null;
  },

  async upsertDoctor(doctor) {
    await ensureCacheTable();

    const rows = normalizeItems('doctor', [doctor], {
      departmentId: doctor.departmentId || null,
      hospitalId: doctor.hospitalId || null,
    });

    await insertRows(rows);
  },

  async refreshDoctors(departmentId, doctors) {
    await ensureCacheTable();
    const departmentIdNum = Number(departmentId);
    await query(
      `DELETE FROM medical_directory_cache
       WHERE directory_type = 'doctor'
         AND department_id = ?`,
      [departmentIdNum]
    );
    const rows = normalizeItems('doctor', doctors, { departmentId: departmentIdNum });
    await insertRows(rows);
  },
};

module.exports = medicalDirectoryModel;
